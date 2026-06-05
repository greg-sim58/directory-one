import 'server-only';
import { cookies, headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { cities, type City } from '@/lib/db/schema';
import type { ResolvedLocation } from '@/components/providers/LocationProvider';

const DEFAULT_LOCATION: ResolvedLocation = {
  source: 'default',
  citySlug: 'austin-tx',
  cityName: 'Austin, TX',
};

// Resolves the user's location in priority order (PLAN.md §3):
//   1. URL segment  (handled by the route — the page knows its `params.city`)
//   2. `loc` cookie (set by the LocationPicker on manual/geolocation resolve)
//   3. Vercel IP geo headers (set by proxy.ts into x-geo-city + x-geo-region)
//   4. Default city (Austin)
//
// `urlSlug` should be the [city] segment from the active route; pass it from
// the page when present, or omit it to fall through to the cookie/headers.
export async function readResolvedLocation(
  urlSlug?: string,
): Promise<ResolvedLocation> {
  // 1. URL segment
  if (urlSlug) {
    const city = await lookupCityBySlug(urlSlug);
    if (city) return { source: 'manual', citySlug: city.slug, cityName: city.name };
  }

  // 2. Cookie
  const cookieStore = await cookies();
  const cookieSlug = cookieStore.get('loc')?.value;
  if (cookieSlug) {
    const city = await lookupCityBySlug(cookieSlug);
    if (city) return { source: 'manual', citySlug: city.slug, cityName: city.name };
  }

  // 3. Vercel IP geo (forwarded by proxy.ts)
  const headerStore = await headers();
  const geoCity = headerStore.get('x-geo-city');
  const geoRegion = headerStore.get('x-geo-region');
  if (geoCity) {
    const candidate = await lookupCityByName(decodeURIComponent(geoCity));
    if (candidate) {
      return { source: 'ip', citySlug: candidate.slug, cityName: candidate.name };
    }
  }

  void geoRegion;
  return DEFAULT_LOCATION;
}

async function lookupCityBySlug(slug: string): Promise<City | null> {
  const rows = await db.select().from(cities).where(eq(cities.slug, slug)).limit(1);
  return rows[0] ?? null;
}

async function lookupCityByName(name: string): Promise<City | null> {
  // Simple exact match; the seed only has Austin. Phase 5+ can add fuzzy
  // match against the cities table once more cities are seeded.
  const rows = await db
    .select()
    .from(cities)
    .where(eq(cities.name, name))
    .limit(1);
  return rows[0] ?? null;
}
