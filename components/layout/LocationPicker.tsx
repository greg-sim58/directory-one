'use client';

import { useState } from 'react';
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
import { useLocationPicker } from '@/components/providers/LocationProvider';
import type { City } from '@/lib/db/schema';

type Props = {
  currentCityName: string;
  currentCitySlug: string;
  displayName?: string;
  isGeoLabel?: boolean;
  cities: Pick<City, 'slug' | 'name' | 'state'>[];
};

export function LocationPicker({
  currentCityName,
  currentCitySlug,
  displayName,
  isGeoLabel,
  cities,
}: Props) {
  const {
    isPickerOpen,
    setPickerOpen,
    candidates,
    geoStatus,
    requestLocation,
    commitCandidate,
    selectCatalogCity,
  } = useLocationPicker();
  const [query, setQuery] = useState('');

  const filtered = query
    ? cities.filter((c) => `${c.name} ${c.state ?? ''}`.toLowerCase().includes(query.toLowerCase()))
    : cities;

  const label = displayName ?? currentCityName;
  const inFlight = geoStatus === 'locating' || geoStatus === 'resolving';

  function commitCity(slug: string) {
    selectCatalogCity(slug);
    setQuery('');
  }

  function commitCandidatePick(candidate: Parameters<typeof commitCandidate>[0]) {
    commitCandidate(candidate);
    setQuery('');
  }

  return (
    <Dialog open={isPickerOpen} onOpenChange={setPickerOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="text-foreground gap-1.5">
            <MapPin className="h-4 w-4" />
            <span className="max-w-[10rem] truncate">{label}</span>
            {isGeoLabel && (
              <span className="text-muted-foreground text-xs font-normal">(change)</span>
            )}
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
            onClick={() => void requestLocation()}
            disabled={inFlight}
            className="justify-start"
          >
            {inFlight ? (
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
          {geoStatus === 'unconfigured' && (
            <p className="text-muted-foreground text-xs">
              Location lookup isn&apos;t configured. Set <code>MAPBOX_SECRET_TOKEN</code> in
              <code> .env</code> to enable nearby town suggestions, or search for a city below.
            </p>
          )}
          {geoStatus === 'noresult' && candidates.length === 0 && (
            <p className="text-muted-foreground text-xs">
              We couldn&apos;t match that to a city. Pick one nearby or search below.
            </p>
          )}

          {candidates.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground text-xs font-medium uppercase">
                Towns near you
              </span>
              <ul className="rounded-md border">
                {candidates.map((c, i) => {
                  const subtitle = c.region ?? c.country ?? '';
                  const inCatalog = cities.some(
                    (city) => city.name.toLowerCase() === c.city.toLowerCase(),
                  );
                  return (
                    <li key={`${c.city}-${c.region ?? ''}-${i}`}>
                      <button
                        type="button"
                        onClick={() => commitCandidatePick(c)}
                        className="hover:bg-muted flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {c.city}
                          {subtitle && <span className="text-muted-foreground">, {subtitle}</span>}
                        </span>
                        {inCatalog && (
                          <span className="text-primary text-xs font-medium">In directory</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
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
                    onClick={() => commitCity(c.slug)}
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
