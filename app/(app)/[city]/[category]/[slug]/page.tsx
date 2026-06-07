import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import {
  getBusinessDetail,
  getNearbyBusinesses,
  getPublishedReviewsForBusinessWithUser,
} from '@/lib/db/queries';
import { Gallery } from '@/components/business/Gallery';
import { HoursCard } from '@/components/business/HoursCard';
import { NAPWHeader } from '@/components/business/NAPWHeader';
import { NearbyMap } from '@/components/business/NearbyMap';
import { OneTapBar } from '@/components/business/OneTapBar';
import { ReviewsList } from '@/components/business/ReviewsList';
import { openStatus } from '@/lib/profile/hours';
import { avgRating } from '@/lib/profile/rating';
import type { WeeklyHours } from '@/lib/db/schema';

type Params = Promise<{ city: string; category: string; slug: string }>;

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { city, category, slug } = await params;
  const business = await getBusinessDetail(city, category, slug);
  if (!business) return { title: 'Not found' };
  return {
    title: `${business.name} — ${business.category.name} in ${business.city.name}`,
    description:
      business.description?.slice(0, 160) ??
      `${business.name} in ${business.city.name}. Reviews, hours, and one-tap contact.`,
  };
}

export default async function BusinessProfilePage({ params }: { params: Params }) {
  const { city, category, slug } = await params;

  // All three reads in parallel — React.cache dedupes getBusinessDetail
  // across NAPW / Hours / Reviews / Nearby / JSON-LD in this same render.
  const [business, reviews, nearby] = await Promise.all([
    getBusinessDetail(city, category, slug),
    getBusinessDetail(city, category, slug).then((b) =>
      b ? getPublishedReviewsForBusinessWithUser(b.id, 20) : [],
    ),
    getBusinessDetail(city, category, slug).then((b) =>
      b ? getNearbyBusinesses(b.id, b.lat, b.lon, 5, 8) : [],
    ),
  ]);

  if (!business) notFound();

  const rating = avgRating(reviews);
  const open = openStatus(business.hours, business.city.timezone);
  const cityHref = `/${business.city.slug}`;
  const categoryHref = `/${business.city.slug}/${business.category.slug}`;
  const jsonLd = buildLocalBusinessJsonLd(business, rating, business.hours, open);

  return (
    <>
      <script
        type="application/ld+json"
        // safe: the JSON we embed is built from server-side DTOs
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="mx-auto max-w-5xl px-4 py-8 pb-28 sm:px-6 md:pb-8">
        <div className="flex flex-col gap-8">
          <Gallery photos={business.photos} name={business.name} />
          <NAPWHeader
            business={business}
            reviews={reviews}
            cityHref={cityHref}
            categoryHref={categoryHref}
          />
          <OneTapBar business={business} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
            <ReviewsList business={business} reviews={reviews} />
            <div className="flex flex-col gap-6">
              <HoursCard business={business} />
              <NearbyMap business={business} nearby={nearby} />
            </div>
          </div>
        </div>
      </article>
    </>
  );
}

function buildLocalBusinessJsonLd(
  business: import('@/lib/profile/schema').BusinessDetail,
  rating: ReturnType<typeof avgRating>,
  hours: WeeklyHours | null,
  open: ReturnType<typeof openStatus>,
) {
  const url = `/${business.city.slug}/${business.category.slug}/${business.slug}`;
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': url,
    name: business.name,
    url,
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.address,
      addressLocality: business.city.name,
      addressRegion: undefined,
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: business.lat,
      longitude: business.lon,
    },
  };
  if (business.phone) ld.telephone = business.phone;
  if (business.website) ld.sameAs = business.website;
  if (business.description) ld.description = business.description;
  if (business.priceTier === 1) ld.priceRange = '$';
  else if (business.priceTier === 2) ld.priceRange = '$$';
  else if (business.priceTier === 3) ld.priceRange = '$$$';
  if (rating) {
    ld.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating.avg.toFixed(1),
      reviewCount: rating.count,
      bestRating: 5,
      worstRating: 1,
    };
  }
  if (hours) {
    const specs: Array<{ '@type': string; dayOfWeek: string; opens: string; closes: string }> = [];
    const dayMap: Record<keyof WeeklyHours, string> = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday',
    };
    for (const [k, v] of Object.entries(hours) as [
      keyof WeeklyHours,
      [string, string] | undefined,
    ][]) {
      if (!v) continue;
      specs.push({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: dayMap[k],
        opens: v[0],
        closes: v[1],
      });
    }
    if (specs.length > 0) ld.openingHoursSpecification = specs;
  }
  if (open.kind !== 'unknown') {
    ld.openingHoursStatus = open.kind === 'open' ? 'Open' : 'Closed';
  }
  return ld;
}
