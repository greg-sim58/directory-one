'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { setGeoCookie, setLocCookie, readLocCookie } from '@/lib/geo-cookie';
import { saveLocationPreference } from '@/actions';

type CityOption = { slug: string; name: string };

type Props = {
  cities: CityOption[];
  defaultCitySlug: string;
};

type GeocodeResult = {
  lat: number;
  lon: number;
  city: string;
};

// Home-page search: a "search for" term + a "Town / City" field. On submit
// we geocode the town (Mapbox via /api/geocode), match it against the
// catalog cities, persist the choice to the DB (saveLocationPreference) and
// to cookies (loc/geo) for future visits, then navigate to the city-level
// search results page. Off-catalog towns set the geo display cookie and
// browse falls back to the default catalog city (PLAN.md §3).
export function HomeSearch({ cities, defaultCitySlug }: Props) {
  const router = useRouter();
  const [term, setTerm] = useState('');
  const [town, setTown] = useState('');
  const [isPending, startTransition] = useTransition();

  function matchCitySlug(cityName: string): string | null {
    const match = cities.find((c) => c.name.toLowerCase() === cityName.toLowerCase());
    return match?.slug ?? null;
  }

  async function geocodeTown(query: string): Promise<GeocodeResult | null> {
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      if (!res.ok) return null;
      const data = (await res.json()) as Partial<GeocodeResult>;
      if (
        typeof data.lat !== 'number' ||
        typeof data.lon !== 'number' ||
        typeof data.city !== 'string'
      ) {
        return null;
      }
      return { lat: data.lat, lon: data.lon, city: data.city };
    } catch {
      return null;
    }
  }

  function navigate(citySlug: string, q: string) {
    const trimmed = q.trim();
    const target = trimmed
      ? `/${citySlug}/search?q=${encodeURIComponent(trimmed)}`
      : `/${citySlug}`;
    router.push(target);
    router.refresh();
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const typedTown = town.trim();

    startTransition(async () => {
      // No town typed: reuse the saved location cookie or fall back to the
      // default catalog city. Nothing new to persist.
      if (!typedTown) {
        const existing = readLocCookie();
        navigate(existing ?? defaultCitySlug, term);
        return;
      }

      const geo = await geocodeTown(typedTown);

      // Geocode failed (rate-limited, unconfigured, no match): still search,
      // but in the default catalog city, and don't persist a bogus location.
      if (!geo) {
        navigate(defaultCitySlug, term);
        return;
      }

      const matchedSlug = matchCitySlug(geo.city);

      // Cookies: loc (catalog browse) only when matched; geo (display label)
      // always so the header reflects the user's actual town.
      if (matchedSlug) setLocCookie(matchedSlug);
      setGeoCookie({ city: geo.city, lat: geo.lat, lon: geo.lon, ts: Date.now() });

      // Persist to the DB keyed by the anonymous visitor cookie.
      await saveLocationPreference({
        townName: geo.city,
        citySlug: matchedSlug ?? undefined,
        lat: geo.lat,
        lon: geo.lon,
      });

      navigate(matchedSlug ?? defaultCitySlug, term);
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 sm:grid-cols-[3fr_2fr] sm:items-end">
      <div className="space-y-2">
        <label
          htmlFor="home-search-term"
          className="text-foreground text-sm font-medium tracking-wide"
        >
          Search for
        </label>
        <div className="relative">
          <Search
            className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            id="home-search-term"
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Plumbers, restaurants, dentists…"
            className="h-11 pl-9"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="home-search-town"
          className="text-foreground text-sm font-medium tracking-wide"
        >
          Town / City
        </label>
        <div className="flex gap-2">
          <Input
            id="home-search-town"
            type="text"
            value={town}
            onChange={(e) => setTown(e.target.value)}
            placeholder="Austin"
            autoComplete="address-level2"
            className="h-11"
          />
          <Button type="submit" disabled={isPending} className="h-11 shrink-0 gap-1.5">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ArrowRight className="h-4 w-4" aria-hidden />
            )}
            <span>Search</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
