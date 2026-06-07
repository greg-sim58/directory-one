import { z } from 'zod';

// Phase 7: input validation for the submitReview server action.
// Used inside the action (after a safeParse); the form does client-side
// checks via HTML5 + this same schema for parity.

export const SubmitReviewSchema = z.object({
  businessId: z.string().min(1).max(64),
  rating: z.coerce.number().int().min(1).max(5),
  name: z.string().min(1).max(80).trim(),
  email: z
    .string()
    .email()
    .max(120)
    .trim()
    .transform((s) => s.toLowerCase()),
  text: z.string().min(10).max(2000).trim(),
  // Honeypot: must be empty. Bots fill hidden fields; humans don't.
  website: z.string().max(0).optional(),
});

export type SubmitReviewInput = z.infer<typeof SubmitReviewSchema>;
