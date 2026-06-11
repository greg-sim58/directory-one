'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  deleteGeoCookie,
  hasResolvingCookie,
  setGeoCookie,
  setLocCookie,
  type GeoCookie,
} from '@/lib/geo-cookie';

export type ResolvedLocation = {
  source: 'gps' | 'ip' | 'manual' | 'default';
  citySlug: string;
  cityName: string;
};

export type DisplayLocation = {
  source: 'geo' | 'default';
  displayName: string;
  city?: string;
  region?: string;
  country?: string;
  lat?: number;
  lon?: number;
};

export type LocationCandidate = {
  city: string;
  region?: string;
  country?: string;
  lat: number;
  lon: number;
};

export type GeoStatus =
  | 'idle'
  | 'locating'
  | 'resolving'
  | 'unsupported'
  | 'denied'
  | 'noresult'
  | 'unconfigured';

type LocationContextValue = {
  isPickerOpen: boolean;
  openPicker: () => void;
  closePicker: () => void;
  setPickerOpen: (open: boolean) => void;
  candidates: LocationCandidate[];
  geoStatus: GeoStatus;
  requestLocation: (opts?: { openPickerOnNoMatch?: boolean }) => Promise<void>;
  commitCandidate: (candidate: LocationCandidate) => void;
  selectCatalogCity: (slug: string) => void;
};

const defaultLocation: ResolvedLocation = {
  source: 'default',
  citySlug: 'austin-tx',
  cityName: 'Austin, TX',
};

const LocationContext = createContext<ResolvedLocation>(defaultLocation);
const PickerContext = createContext<LocationContextValue | null>(null);

export function useLocation() {
  return useContext(LocationContext);
}

export function useLocationPicker(): LocationContextValue {
  const ctx = useContext(PickerContext);
  if (!ctx) {
    throw new Error('useLocationPicker must be used inside <LocationProvider>');
  }
  return ctx;
}

type ResolvedCity = { slug: string; name: string };

type LocationProviderProps = {
  children: ReactNode;
  cities: ResolvedCity[];
};

function candidateToGeo(c: LocationCandidate, ts: number): GeoCookie {
  return {
    city: c.city,
    region: c.region,
    country: c.country,
    lat: c.lat,
    lon: c.lon,
    ts,
  };
}

export function LocationProvider({ children, cities }: LocationProviderProps) {
  const router = useRouter();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [candidates, setCandidates] = useState<LocationCandidate[]>([]);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const hasAutoPromptedRef = useRef(false);
  const inFlightRef = useRef(false);

  const openPicker = useCallback(() => setIsPickerOpen(true), []);
  const closePicker = useCallback(() => setIsPickerOpen(false), []);
  const setPickerOpen = useCallback((open: boolean) => setIsPickerOpen(open), []);

  const selectCatalogCity = useCallback(
    (slug: string) => {
      setLocCookie(slug);
      deleteGeoCookie();
      setIsPickerOpen(false);
      setCandidates([]);
      if (typeof window !== 'undefined' && window.location.pathname !== `/${slug}`) {
        router.push(`/${slug}`);
      }
      router.refresh();
    },
    [router],
  );

  const requestLocation = useCallback(
    async (opts?: { openPickerOnNoMatch?: boolean }) => {
      if (typeof window === 'undefined') return;
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      const openPickerOnNoMatch = opts?.openPickerOnNoMatch ?? false;

      if (!('geolocation' in navigator)) {
        setGeoStatus('unsupported');
        inFlightRef.current = false;
        return;
      }

      const settle = (status: GeoStatus) => {
        setGeoStatus(status);
        inFlightRef.current = false;
      };

      setGeoStatus('locating');
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          setGeoStatus('resolving');
          try {
            const params = new URLSearchParams({
              lat: pos.coords.latitude.toString(),
              lon: pos.coords.longitude.toString(),
            });
            const res = await fetch(`/api/location/resolve?${params.toString()}`);
            if (!res.ok) {
              setCandidates([]);
              settle('noresult');
              return;
            }
            const data = (await res.json()) as {
              city?: string;
              region?: string;
              country?: string;
              lat?: number;
              lon?: number;
              candidates?: LocationCandidate[];
              degraded?: boolean;
            };
            if (data.degraded) {
              setCandidates([]);
              settle('unconfigured');
              return;
            }
            const list: LocationCandidate[] = Array.isArray(data.candidates)
              ? data.candidates
              : data.city && typeof data.lat === 'number' && typeof data.lon === 'number'
                ? [
                    {
                      city: data.city,
                      region: data.region,
                      country: data.country,
                      lat: data.lat,
                      lon: data.lon,
                    },
                  ]
                : [];

            if (list.length === 0) {
              setCandidates([]);
              settle('noresult');
              return;
            }

            setCandidates(list);
            const closest = list[0];
            const matched = cities.find((c) => c.name.toLowerCase() === closest.city.toLowerCase());
            const ts = Date.now();

            if (matched) {
              setLocCookie(matched.slug);
              setGeoCookie(candidateToGeo(closest, ts));
              const target = `/${matched.slug}`;
              if (window.location.pathname !== target) {
                router.push(target);
              }
              router.refresh();
              setIsPickerOpen(false);
              setCandidates([]);
              settle('idle');
            } else {
              setGeoCookie(candidateToGeo(closest, ts));
              if (window.location.pathname !== '/') {
                router.push('/');
              }
              router.refresh();
              if (openPickerOnNoMatch) {
                queueMicrotask(() => setIsPickerOpen(true));
              }
              settle('idle');
            }
          } catch {
            setCandidates([]);
            settle('noresult');
          }
        },
        () => settle('denied'),
        { enableHighAccuracy: false, timeout: 8000 },
      );
    },
    [cities, router],
  );

  const commitCandidate = useCallback(
    (candidate: LocationCandidate) => {
      const matched = cities.find((c) => c.name.toLowerCase() === candidate.city.toLowerCase());
      if (matched) {
        selectCatalogCity(matched.slug);
        return;
      }
      setGeoCookie(candidateToGeo(candidate, Date.now()));
      setIsPickerOpen(false);
      setCandidates([]);
      if (window.location.pathname !== '/') {
        router.push('/');
      }
      router.refresh();
    },
    [cities, router, selectCatalogCity],
  );

  const pickerValue = useMemo<LocationContextValue>(
    () => ({
      isPickerOpen,
      openPicker,
      closePicker,
      setPickerOpen,
      candidates,
      geoStatus,
      requestLocation,
      commitCandidate,
      selectCatalogCity,
    }),
    [
      isPickerOpen,
      openPicker,
      closePicker,
      setPickerOpen,
      candidates,
      geoStatus,
      requestLocation,
      commitCandidate,
      selectCatalogCity,
    ],
  );

  useEffect(() => {
    if (hasAutoPromptedRef.current) return;
    hasAutoPromptedRef.current = true;
    if (typeof window === 'undefined') return;
    if (hasResolvingCookie()) return;
    // Defer to a microtask so we don't fire state setters synchronously
    // inside the effect body (`react-hooks/set-state-in-effect`).
    queueMicrotask(() => {
      void requestLocation({ openPickerOnNoMatch: true });
    });
  }, [requestLocation]);

  return (
    <PickerContext.Provider value={pickerValue}>
      <LocationContext.Provider value={defaultLocation}>{children}</LocationContext.Provider>
    </PickerContext.Provider>
  );
}
