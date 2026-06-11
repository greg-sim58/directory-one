// Server actions live here (PLAN.md §9: "actions/  Server actions (submit review, save business)")
// Phase 7 adds submitReview; Phase 8 adds claimBusiness and others.

'use server';

import { cookies } from 'next/headers';
import { z } from '@/lib/validation';
import { db } from '@/lib/db/client';
import { locationPreferences } from '@/lib/db/schema';

const ONE_YEAR_S = 60 * 60 * 24 * 365;

const SaveLocationInput = z.object({
  townName: z.string().min(1).max(128),
  region: z.string().max(64).optional(),
  country: z.string().max(64).optional(),
  citySlug: z
    .string()
    .max(64)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
});

export type SaveLocationInput = z.infer<typeof SaveLocationInput>;

// Persists the visitor's chosen Town/City to the database, keyed by an
// anonymous `vid` cookie (no user/session yet — auth adapter is Phase 8).
// Creates the `vid` cookie on first use. Wrapped so a DB failure never
// blocks the client's navigation.
export async function saveLocationPreference(input: SaveLocationInput): Promise<{ ok: boolean }> {
  const parsed = SaveLocationInput.safeParse(input);
  if (!parsed.success) return { ok: false };

  const cookieStore = await cookies();
  let visitorId = cookieStore.get('vid')?.value;
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    cookieStore.set('vid', visitorId, {
      maxAge: ONE_YEAR_S,
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
    });
  }

  const { townName, region, country, citySlug, lat, lon } = parsed.data;

  try {
    await db
      .insert(locationPreferences)
      .values({ visitorId, townName, region, country, citySlug, lat, lon })
      .onConflictDoUpdate({
        target: locationPreferences.visitorId,
        set: { townName, region, country, citySlug, lat, lon, updatedAt: new Date() },
      });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
