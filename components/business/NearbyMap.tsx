import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapClient } from '@/components/map/MapClient';
import { formatMiles } from '@/lib/profile/format-distance';
import type { BusinessDetail, NearbyItem } from '@/lib/profile/schema';

type Props = {
  business: BusinessDetail;
  nearby: NearbyItem[];
};

export function NearbyMap({ business, nearby }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nearby</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <MapClient
          hits={[
            {
              id: business.id,
              slug: business.slug,
              name: business.name,
              lat: business.lat,
              lon: business.lon,
            },
            ...nearby.map((n) => ({
              id: n.id,
              slug: n.slug,
              name: n.name,
              lat: n.lat,
              lon: n.lon,
            })),
          ]}
          citySlug={business.city.slug}
          categorySlug={business.category.slug}
          className="h-72"
        />
        {nearby.length > 0 ? (
          <ul className="flex flex-col divide-y">
            {nearby.slice(0, 6).map((n) => (
              <li key={n.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <a
                  href={`/${business.city.slug}/${business.category.slug}/${n.slug}`}
                  className="text-foreground hover:underline truncate"
                >
                  {n.name}
                </a>
                <span className="text-muted-foreground tabular-nums">
                  {formatMiles(n.distanceM)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">No other businesses within 5 km.</p>
        )}
      </CardContent>
    </Card>
  );
}
