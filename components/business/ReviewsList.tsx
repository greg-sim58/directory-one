import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Stars } from './Stars';
import { avgRating } from '@/lib/profile/rating';
import { formatRelativeDate } from '@/lib/profile/hours';
import type { BusinessDetail, ReviewWithUser } from '@/lib/profile/schema';

type Props = {
  business: BusinessDetail;
  reviews: ReviewWithUser[];
  canWrite: false;
};

export function ReviewsList({ business, reviews, canWrite }: Props) {
  const summary = avgRating(reviews);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reviews</CardTitle>
        {summary ? (
          <div className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
            <Stars value={summary.avg} size="sm" />
            <span className="text-foreground font-medium tabular-nums">
              {summary.avg.toFixed(1)}
            </span>
            <span>
              · {summary.count} {summary.count === 1 ? 'review' : 'reviews'}
            </span>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <WriteReviewCTA businessName={business.name} disabled={!canWrite} />

        {reviews.length === 0 ? (
          <p className="text-muted-foreground text-sm">Be the first to review {business.name}.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {reviews.map((r, i) => (
              <li key={r.id} className="flex flex-col gap-2">
                {i > 0 ? <Separator /> : null}
                <div className="flex items-center gap-2">
                  <Stars value={r.rating} size="sm" />
                  <span className="text-foreground text-sm font-medium">
                    {r.author.name ?? 'Anonymous'}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    · {formatRelativeDate(r.createdAt)}
                  </span>
                  {r.verifiedPurchase ? (
                    <span className="text-muted-foreground ml-auto text-[10px] tracking-wide uppercase">
                      Verified
                    </span>
                  ) : null}
                </div>
                <p className="text-foreground/90 text-sm leading-relaxed">{r.text}</p>
                {r.ownerResponse ? (
                  <blockquote className="bg-muted/50 border-l-2 border-foreground/30 ml-2 rounded-r-md py-2 pl-3 pr-2 text-sm">
                    <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                      Owner response
                      {r.ownerRespondedAt
                        ? ` · ${formatRelativeDate(r.ownerRespondedAt)}`
                        : ''}
                    </p>
                    <p className="text-foreground/90 mt-1 leading-relaxed">
                      {r.ownerResponse}
                    </p>
                  </blockquote>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function WriteReviewCTA({
  businessName,
  disabled,
}: {
  businessName: string;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={
        disabled
          ? 'Sign in to write a review (coming soon)'
          : `Write a review of ${businessName}`
      }
      className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 w-fit items-center justify-center rounded-lg px-3 text-sm font-medium transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
    >
      Write a review
    </button>
  );
}
