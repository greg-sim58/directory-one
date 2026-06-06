'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

// Per PLAN.md / Phase 5: list ↔ map pin highlight sync.
//
// State lives in a Context at the (app) layout so both the result list
// and the map can read/write without prop-drilling. The Context is
// intentionally NOT URL state — `?focus=ID` would trigger a server
// re-render on every hover, which is wasteful. (We can add a
// shareable-focus URL param later as a separate concern.)

type MapSyncContextValue = {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
};

const MapSyncContext = createContext<MapSyncContextValue | null>(null);

export function MapSyncProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedIdRaw] = useState<string | null>(null);
  const setSelectedId = useCallback((id: string | null) => setSelectedIdRaw(id), []);
  const value = useMemo(() => ({ selectedId, setSelectedId }), [selectedId, setSelectedId]);
  return <MapSyncContext.Provider value={value}>{children}</MapSyncContext.Provider>;
}

export function useMapSync(): MapSyncContextValue {
  const ctx = useContext(MapSyncContext);
  if (!ctx) {
    throw new Error('useMapSync must be used within a <MapSyncProvider>');
  }
  return ctx;
}
