'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, MapPin, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import type { City } from '@/lib/db/schema';

type Props = {
  currentCityName: string;
  currentCitySlug: string;
  cities: Pick<City, 'slug' | 'name' | 'state'>[];
};

type GeoStatus = 'idle' | 'locating' | 'resolving' | 'unsupported' | 'denied' | 'noresult';

function slugifyToCitySlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function LocationPicker({ currentCityName, currentCitySlug, cities }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [, startTransition] = useTransition();

  const filtered = query
    ? cities.filter((c) => `${c.name} ${c.state ?? ''}`.toLowerCase().includes(query.toLowerCase()))
    : cities;

  function selectCity(slug: string) {
    document.cookie = `loc=${slug}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => {
      router.push(`/${slug}`);
      router.refresh();
    });
    setOpen(false);
    setQuery('');
    setGeoStatus('idle');
  }

  async function useCurrentLocation() {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGeoStatus('unsupported');
      return;
    }
    setGeoStatus('locating');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGeoStatus('resolving');
        try {
          const params = new URLSearchParams({
            lat: pos.coords.latitude.toString(),
            lon: pos.coords.longitude.toString(),
          });
          const res = await fetch(`/api/geocode?${params.toString()}`);
          if (!res.ok) {
            setGeoStatus('noresult');
            return;
          }
          const data = (await res.json()) as { city?: string };
          if (!data.city) {
            setGeoStatus('noresult');
            return;
          }
          // Try to find the city in our list (exact name match).
          const matched = cities.find((c) => c.name.toLowerCase() === data.city!.toLowerCase());
          if (matched) {
            selectCity(matched.slug);
            return;
          }
          // No match — navigate to a slug derived from the name so the user
          // sees a real URL. The 404 page handles the not-yet-seeded case.
          selectCity(slugifyToCitySlug(data.city));
        } catch {
          setGeoStatus('noresult');
        }
      },
      () => setGeoStatus('denied'),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="text-foreground gap-1.5">
            <MapPin className="h-4 w-4" />
            <span className="max-w-[10rem] truncate">{currentCityName}</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Your city</DialogTitle>
          <DialogDescription>
            We&apos;ll show you local services in the right place.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={useCurrentLocation}
            disabled={geoStatus === 'locating' || geoStatus === 'resolving'}
            className="justify-start"
          >
            {geoStatus === 'locating' || geoStatus === 'resolving' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
            <span>Use my current location</span>
          </Button>

          {geoStatus === 'denied' && (
            <p className="text-muted-foreground text-xs">
              Permission denied. Search for a city below.
            </p>
          )}
          {geoStatus === 'unsupported' && (
            <p className="text-muted-foreground text-xs">
              Geolocation isn&apos;t available in this browser.
            </p>
          )}
          {geoStatus === 'noresult' && (
            <p className="text-muted-foreground text-xs">
              We couldn&apos;t match that to a city in our directory yet.
            </p>
          )}

          <div className="flex items-center gap-2">
            <Separator className="flex-1" />
            <span className="text-muted-foreground text-xs uppercase">or</span>
            <Separator className="flex-1" />
          </div>

          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a city…"
              className="pl-9"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <ul className="max-h-64 overflow-y-auto rounded-md border">
            {filtered.length === 0 && (
              <li className="text-muted-foreground px-4 py-6 text-center text-sm">
                No cities match &quot;{query}&quot;.
              </li>
            )}
            {filtered.map((c) => {
              const isCurrent = c.slug === currentCitySlug;
              return (
                <li key={c.slug}>
                  <button
                    type="button"
                    onClick={() => selectCity(c.slug)}
                    className="hover:bg-muted flex w-full items-center justify-between px-4 py-3 text-left text-sm"
                  >
                    <span>
                      {c.name}
                      {c.state && <span className="text-muted-foreground">, {c.state}</span>}
                    </span>
                    {isCurrent && <Check className="text-primary h-4 w-4" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
