import { Badge } from '@/components/ui/badge';
import { Stars } from './Stars';
import { avgRating } from '@/lib/profile/rating';
import type { BusinessDetail, ReviewWithGuest } from '@/lib/profile/schema';
import { openStatus, formatRelativeDate } from '@/lib/profile/hours';

type Props = {
  business: BusinessDetail;
  reviews: ReviewWithGuest[];
  cityHref: string;
  categoryHref: string;
};

const PRICE_LABEL: Record<1 | 2 | 3, string> = { 1: '$', 2: '$$', 3: '$$$' };

export function NAPWHeader({ business, reviews, cityHref, categoryHref }: Props) {
  const rating = avgRating(reviews);
  const status = openStatus(business.hours, business.city.timezone);
  const statusBadge = badgeForStatus(business.status);
  const openBadge = badgeForOpenStatus(status);

  return (
    <header className="flex flex-col gap-4">
      <nav
        aria-label="Breadcrumb"
        className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs"
      >
        <a href={cityHref} className="hover:text-foreground capitalize">
          {business.city.name}
        </a>
        <span aria-hidden>/</span>
        <a href={categoryHref} className="hover:text-foreground">
          {business.category.name}
        </a>
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-[10px]">
          {business.category.name}
        </Badge>
        <Badge variant="secondary" className="text-[10px] capitalize">
          {statusBadge}
        </Badge>
        {openBadge ? (
          <Badge variant="outline" className="text-[10px]">
            {openBadge}
          </Badge>
        ) : null}
        {business.priceTier ? (
          <Badge variant="outline" className="text-[10px]">
            {PRICE_LABEL[business.priceTier]}
          </Badge>
        ) : null}
      </div>

      <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        {business.name}
      </h1>

      {rating ? (
        <div className="flex items-center gap-2 text-sm">
          <Stars value={rating.avg} />
          <span className="font-medium tabular-nums">{rating.avg.toFixed(1)}</span>
          <span className="text-muted-foreground">
            ({rating.count} {rating.count === 1 ? 'review' : 'reviews'})
          </span>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No reviews yet</p>
      )}

      {business.description ? (
        <p className="text-foreground/90 max-w-2xl text-base leading-relaxed">
          {business.description}
        </p>
      ) : null}

      <dl className="text-muted-foreground flex flex-col gap-1.5 text-sm">
        <div className="flex items-start gap-2">
          <dt className="sr-only">Address</dt>
          <dd>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${business.lat},${business.lon}`}
              target="_blank"
              rel="noreferrer noopener"
              className="hover:text-foreground underline-offset-4 hover:underline"
            >
              {business.address}
            </a>
          </dd>
        </div>
        {business.phone ? (
          <div className="flex items-start gap-2">
            <dt className="sr-only">Phone</dt>
            <dd>
              <a
                href={`tel:${business.phone.replace(/\D/g, '')}`}
                className="hover:text-foreground tabular-nums underline-offset-4 hover:underline"
              >
                {business.phone}
              </a>
            </dd>
          </div>
        ) : null}
        {business.website ? (
          <div className="flex items-start gap-2">
            <dt className="sr-only">Website</dt>
            <dd>
              <a
                href={business.website}
                target="_blank"
                rel="noreferrer noopener"
                className="hover:text-foreground underline-offset-4 hover:underline"
              >
                {prettyUrl(business.website)}
              </a>
            </dd>
          </div>
        ) : null}
        <p className="text-xs">Listed {formatRelativeDate(business.createdAt)}</p>
      </dl>
    </header>
  );
}

function badgeForStatus(s: BusinessDetail['status']): string {
  switch (s) {
    case 'verified':
      return 'Verified';
    case 'pending':
      return 'Claim pending';
    case 'closed':
      return 'Closed';
    default:
      return 'Unclaimed';
  }
}

function badgeForOpenStatus(s: ReturnType<typeof openStatus>): string | null {
  if (s.kind === 'unknown') return null;
  if (s.kind === 'open') {
    const closeTime = formatHourFromDate(s.nextChangeAt);
    return `Open · Closes ${closeTime}`;
  }
  return 'Closed now';
}

function formatHourFromDate(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function prettyUrl(raw: string): string {
  try {
    const u = new URL(raw);
    return u.hostname.replace(/^www\./, '') + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    return raw;
  }
}
