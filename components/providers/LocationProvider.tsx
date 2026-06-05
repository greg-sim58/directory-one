'use client';

// Placeholder LocationProvider. Phase 3 will wire this to:
//   - navigator.geolocation
//   - IP fallback (proxy.ts reads Vercel headers into x-geo-*)
//   - cookie persistence
//   - manual picker
// For Phase 1 this is a no-op context so downstream components can compile.

import { createContext, useContext, useMemo, type ReactNode } from 'react';

export type ResolvedLocation = {
  source: 'gps' | 'ip' | 'manual' | 'default';
  citySlug: string;
  cityName: string;
  lat?: number;
  lon?: number;
};

const defaultLocation: ResolvedLocation = {
  source: 'default',
  citySlug: 'austin-tx',
  cityName: 'Austin, TX',
};

const LocationContext = createContext<ResolvedLocation>(defaultLocation);

export function LocationProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => defaultLocation, []);
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  return useContext(LocationContext);
}
