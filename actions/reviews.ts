'use server';

import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { businesses, reviews } from '@/lib/db/schema';
import { checkSpam, SPAM_MESSAGES, spamReasonToField } from '@/lib/reviews/spam';
import { hashEmail } from '@/lib/reviews/hash';
import { checkSubmitRateLimits } from '@/lib/reviews/rate-limit';
import { SubmitReviewSchema } from '@/lib/reviews/schema';
import type { SubmitReviewField, SubmitReviewState } from '@/lib/reviews/submit-state';

export async function submitReview(
  _prev: SubmitReviewState,
  formData: FormData,
): Promise<SubmitReviewState> {
  const raw = Object.fromEntries(formData);

  // 1. Honeypot first: silent success for bots. Don't write, don't leak.
  if (typeof raw.website === 'string' && raw.website.trim().length > 0) {
    return { status: 'success', reviewId: '' };
  }

  // 2. Parse + validate.
  const parsed = SubmitReviewSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const first = (k: 'name' | 'email' | 'text' | 'rating' | 'businessId') =>
      (flat.fieldErrors[k] ?? [])[0];
    const errMsg =
      first('rating') ??
      first('name') ??
      first('email') ??
      first('text') ??
      first('businessId') ??
      'Please check the form and try again.';
    const field: SubmitReviewField = first('rating')
      ? 'rating'
      : first('name')
        ? 'name'
        : first('email')
          ? 'email'
          : first('text')
            ? 'text'
            : 'form';
    return {
      status: 'error',
      field,
      message: errMsg,
      values: rawValues(raw),
    };
  }
  const { businessId, rating, name, email, text } = parsed.data;
  const emailHash = hashEmail(email);

  // 3. Spam heuristic.
  const spam = checkSpam({ name, email, text });
  if (!spam.ok) {
    return {
      status: 'error',
      field: spamReasonToField(spam.reason),
      message: SPAM_MESSAGES[spam.reason],
      values: { name, email, text, rating },
    };
  }

  // 4. Rate limit (per IP + per email hash).
  const ip = await readClientIp();
  const limits = checkSubmitRateLimits(ip, emailHash);
  if (!limits.ok) {
    return {
      status: 'error',
      field: 'form',
      message: 'You\u2019re submitting reviews too quickly. Try again in a few minutes.',
      values: { name, email, text, rating },
    };
  }

  // 5. Resolve the business -> city/category/slug for revalidatePath.
  const meta = await db
    .select({
      citySlug: businesses.citySlug,
      categorySlug: businesses.categorySlug,
      slug: businesses.slug,
    })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);
  if (meta.length === 0) {
    return {
      status: 'error',
      field: 'form',
      message: 'This business is no longer available.',
      values: { name, email, text, rating },
    };
  }

  // 6. Insert. Unique violation = already reviewed.
  try {
    const inserted = await db
      .insert(reviews)
      .values({
        businessId,
        rating,
        text,
        authorName: name,
        authorEmail: email,
        authorEmailHash: emailHash,
        status: 'published',
      })
      .returning({ id: reviews.id });
    revalidatePath(`/${meta[0]!.citySlug}/${meta[0]!.categorySlug}/${meta[0]!.slug}`);
    return { status: 'success', reviewId: inserted[0]!.id };
  } catch (e) {
    if (isUniqueViolation(e)) {
      return {
        status: 'error',
        field: 'email',
        message: 'You\u2019ve already reviewed this business.',
        values: { name, email, text, rating },
      };
    }
    throw e;
  }
}

// ---- helpers ----

function rawValues(raw: Record<string, FormDataEntryValue>): {
  name: string;
  email: string;
  text: string;
  rating: number;
} {
  return {
    name: typeof raw.name === 'string' ? raw.name : '',
    email: typeof raw.email === 'string' ? raw.email : '',
    text: typeof raw.text === 'string' ? raw.text : '',
    rating:
      typeof raw.rating === 'string' || typeof raw.rating === 'number'
        ? Number(raw.rating) || 0
        : 0,
  };
}

function isUniqueViolation(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  // Drizzle wraps postgres errors; the original PG code lives on `.cause`
  // for some drivers and on the top-level for others.
  const err = e as { code?: unknown; cause?: { code?: unknown } };
  return err.code === '23505' || err.cause?.code === '23505';
}

async function readClientIp(): Promise<string> {
  try {
    const h = await headers();
    return (
      h.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      h.get('x-real-ip')?.trim() ||
      'unknown'
    );
  } catch {
    return 'unknown';
  }
}
