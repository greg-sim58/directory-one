// Phase 7: state shape for the submitReview action. Lives outside the
// 'use server' file (which can only export async functions).

export type SubmitReviewField = 'name' | 'email' | 'text' | 'rating' | 'form';

export type SubmitReviewState =
  | { status: 'idle' }
  | { status: 'success'; reviewId: string }
  | {
      status: 'error';
      field?: SubmitReviewField;
      message: string;
      values: { name: string; email: string; text: string; rating: number };
    };

export const initialReviewState: SubmitReviewState = { status: 'idle' };
