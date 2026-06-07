'use client';

import { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Stars } from './Stars';
import { ReviewForm } from './ReviewForm';
import { avgRating } from '@/lib/profile/rating';
import { formatRelativeDate } from '@/lib/profile/hours';
import type { BusinessDetail, ReviewWithGuest } from '@/lib/profile/schema';

type Props = {
  business: BusinessDetail;
  reviews: ReviewWithGuest[];
};

export function ReviewsList({ business, reviews }: Props) {
  const summary = avgRating(reviews);
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Reviews</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <span>Write a review</span>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <ReviewForm
                businessId={business.id}
                businessName={business.name}
                onClose={() => setOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
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
        {reviews.length === 0 ? (
          <p className="text-muted-foreground text-sm">Be the first to review {business.name}.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {reviews.map((r, i) => (
              <li key={r.id} className="flex flex-col gap-2">
                {i > 0 ? <Separator /> : null}
                <div className="flex items-center gap-2">
                  <Stars value={r.rating} size="sm" />
                  <span className="text-foreground text-sm font-medium">{r.author.display}</span>
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
                  <blockquote className="bg-muted/50 border-foreground/30 ml-2 rounded-r-md border-l-2 py-2 pr-2 pl-3 text-sm">
                    <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                      Owner response
                      {r.ownerRespondedAt ? ` · ${formatRelativeDate(r.ownerRespondedAt)}` : ''}
                    </p>
                    <p className="text-foreground/90 mt-1 leading-relaxed">{r.ownerResponse}</p>
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
