export type RatingSummary = { avg: number; count: number };

export function avgRating(
  reviews: ReadonlyArray<{ rating: number }>,
): RatingSummary | null {
  if (reviews.length === 0) return null;
  let sum = 0;
  for (const r of reviews) sum += r.rating;
  const avg = sum / reviews.length;
  return { avg: Math.round(avg * 10) / 10, count: reviews.length };
}
