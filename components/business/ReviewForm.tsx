'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { submitReview, initialReviewState, type SubmitReviewState } from '@/actions/reviews';

type Props = {
  businessId: string;
  businessName: string;
  onClose: () => void;
};

const MAX_TEXT = 2000;

export function ReviewForm({ businessId, businessName, onClose }: Props) {
  const [state, formAction, pending] = useActionState<SubmitReviewState, FormData>(
    submitReview,
    initialReviewState,
  );
  const [rating, setRating] = useState<number>(0);
  const [text, setText] = useState<string>('');
  const formRef = useRef<HTMLFormElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const formId = useId();
  const fieldIds = {
    rating: `${formId}-rating`,
    name: `${formId}-name`,
    email: `${formId}-email`,
    text: `${formId}-text`,
  };

  // Close dialog + toast on success.
  useEffect(() => {
    if (state.status === 'success') {
      if (state.reviewId) {
        toast.success('Thanks — your review is live.');
      }
      onClose();
    }
  }, [state, onClose]);

  const fieldError = (k: 'rating' | 'name' | 'email' | 'text'): string | null => {
    if (state.status !== 'error') return null;
    if (state.field === k) return state.message;
    return null;
  };
  const formError = state.status === 'error' && state.field === 'form' ? state.message : null;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        // Keep the form value for `rating` in sync; the hidden input below
        // is updated by the click handler, so action sees it directly.
        const fd = new FormData(e.currentTarget);
        if (!fd.get('rating')) {
          e.preventDefault();
          const live = liveRef.current;
          if (live) live.textContent = 'Please choose a star rating.';
        }
      }}
    >
      <input type="hidden" name="businessId" value={businessId} />
      {/* Honeypot: hidden from humans, fills-in bots. */}
      <div aria-hidden className="hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <DialogHeader>
        <DialogTitle>Write a review</DialogTitle>
        <DialogDescription>Your name and email aren\u2019t shown publicly.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <Label id={`${fieldIds.rating}-label`}>Your rating</Label>
        <div
          role="radiogroup"
          aria-labelledby={`${fieldIds.rating}-label`}
          aria-describedby={fieldError('rating') ? `${fieldIds.rating}-err` : undefined}
          className="flex items-center gap-1"
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault();
              setRating((r) => Math.min(5, (r || 0) + 1));
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault();
              setRating((r) => Math.max(1, (r || 1) - 1));
            }
          }}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n === 1 ? '' : 's'}`}
              onClick={() => setRating(n)}
              className="hover:text-foreground text-muted-foreground rounded p-0.5 transition-colors"
            >
              <Star
                className="size-6"
                fill={rating >= n ? 'currentColor' : 'none'}
                strokeWidth={1.5}
              />
            </button>
          ))}
          <input type="hidden" name="rating" value={rating} />
        </div>
        {fieldError('rating') ? (
          <p id={`${fieldIds.rating}-err`} className="text-destructive text-xs">
            {fieldError('rating')}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={fieldIds.name}>Name</Label>
        <Input
          id={fieldIds.name}
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={80}
          aria-invalid={!!fieldError('name')}
          aria-describedby={fieldError('name') ? `${fieldIds.name}-err` : undefined}
          defaultValue={state.status === 'error' ? state.values.name : ''}
        />
        {fieldError('name') ? (
          <p id={`${fieldIds.name}-err`} className="text-destructive text-xs">
            {fieldError('name')}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={fieldIds.email}>Email</Label>
        <Input
          id={fieldIds.email}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          maxLength={120}
          aria-invalid={!!fieldError('email')}
          aria-describedby={fieldError('email') ? `${fieldIds.email}-err` : undefined}
          defaultValue={state.status === 'error' ? state.values.email : ''}
        />
        {fieldError('email') ? (
          <p id={`${fieldIds.email}-err`} className="text-destructive text-xs">
            {fieldError('email')}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={fieldIds.text}>Your review of {businessName}</Label>
        <textarea
          id={fieldIds.text}
          name="text"
          required
          minLength={10}
          maxLength={MAX_TEXT}
          rows={5}
          aria-invalid={!!fieldError('text')}
          aria-describedby={fieldError('text') ? `${fieldIds.text}-err` : `${fieldIds.text}-hint`}
          className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 flex w-full min-w-0 rounded-lg border bg-transparent px-2.5 py-2 text-base transition-colors outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          {fieldError('text') ? (
            <p id={`${fieldIds.text}-err`} className="text-destructive">
              {fieldError('text')}
            </p>
          ) : (
            <span id={`${fieldIds.text}-hint`}>
              {text.length < 10 ? `${10 - text.length} more characters to go` : 'Looking good.'}
            </span>
          )}
          <span className="tabular-nums">
            {text.length} / {MAX_TEXT}
          </span>
        </div>
      </div>

      {formError ? (
        <p role="alert" className="text-destructive text-sm">
          {formError}
        </p>
      ) : null}

      <p ref={liveRef} aria-live="polite" className="sr-only" />

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="ghost" />}>Cancel</DialogClose>
        <Button type="submit" disabled={pending || rating === 0}>
          {pending ? 'Submitting\u2026' : 'Post review'}
        </Button>
      </DialogFooter>
    </form>
  );
}
