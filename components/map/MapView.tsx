'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Map as MapboxMap, Marker, NavigationControl, Popup, type MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

import { MAPBOX_STYLE_LIGHT, MAPBOX_STYLE_DARK, getMapboxToken } from '@/lib/map/mapbox-style';
import { computeBounds, boundsContainAny, type LngLat, type LngLatBounds } from '@/lib/map/bounds';
import { MapPinMarker } from './MapPin';
import { useMapSync } from './MapSyncProvider';
import type { BusinessDoc } from '@/lib/validation';

// The actual Mapbox-rendering Client Component. Lazy-loaded by
// MapClient via `next/dynamic({ ssr: false })` so the mapbox-gl bundle
// (≈250KB gz) doesn't ship on pages that don't render a map.
//
// Renders one <Marker> per hit; hover shows a popup; click navigates
// to the business profile. Re-fits the camera to the new pin set
// when `hits` change — but only if the current view contains zero of
// the new points, so the user's pan/zoom is preserved across filter
// changes when possible.

type Props = {
  hits: BusinessDoc[];
  citySlug: string;
  categorySlug: string;
  fallbackBounds?: LngLatBounds;
  className?: string;
};

const FIT_BOUNDS_OPTIONS = {
  padding: 48,
  maxZoom: 14,
  duration: 600,
};

// Subscribes to a CSS media query without firing setState in an effect
// — `useSyncExternalStore` is the React-blessed pattern for this.
function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    [query],
  );
  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  }, [query]);
  const getServerSnapshot = useCallback(() => false, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default function MapView({ hits, citySlug, categorySlug, fallbackBounds, className }: Props) {
  const router = useRouter();
  const { selectedId } = useMapSync();
  const mapRef = useRef<MapRef | null>(null);
  const [hovered, setHovered] = useState<{ id: string; lon: number; lat: number } | null>(null);
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const dark = useMediaQuery('(prefers-color-scheme: dark)');
  const styleUrl = dark ? MAPBOX_STYLE_DARK : MAPBOX_STYLE_LIGHT;

  const token = useMemo(() => getMapboxToken(), []);

  const points = useMemo<LngLat[]>(
    () => hits.filter((h) => Number.isFinite(h.lat) && Number.isFinite(h.lon)).map((h) => [h.lon, h.lat]),
    [hits],
  );

  // Initial view: fit to all points, or to fallbackBounds if no points.
  // On filter change, only re-fit if the current view doesn't contain
  // any of the new points (preserve user's pan/zoom when possible).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = points.length > 0 ? computeBounds(points) : fallbackBounds ?? null;
    if (!bounds) return;
    if (!map.isStyleLoaded()) {
      // The map's style hasn't loaded yet — re-fit on the next load.
      const handler = () => {
        map.fitBounds(bounds, { ...FIT_BOUNDS_OPTIONS, duration: reduceMotion ? 0 : FIT_BOUNDS_OPTIONS.duration });
        map.off('load', handler);
      };
      map.on('load', handler);
      return;
    }
    // First render: always fit. Subsequent: only if out-of-view.
    const current = map.getBounds();
    if (
      !current ||
      !boundsContainAny(
        [
          [current.getWest(), current.getSouth()],
          [current.getEast(), current.getNorth()],
        ],
        points,
      )
    ) {
      map.fitBounds(bounds, {
        ...FIT_BOUNDS_OPTIONS,
        duration: reduceMotion ? 0 : FIT_BOUNDS_OPTIONS.duration,
      });
    }
    // Intentionally only re-run on hits identity change (id-keyed by
    // the parent). Including `points` would re-fit on every re-render
    // even when the same set of points is projected differently.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hits]);

  if (!token) {
    return (
      <div
        className={
          'bg-muted/40 text-muted-foreground flex w-full items-center justify-center rounded-xl text-xs ' +
          (className ?? '')
        }
        aria-label="Map disabled"
      >
        Map unavailable — set NEXT_PUBLIC_MAPBOX_TOKEN to enable.
      </div>
    );
  }

  return (
    <div className={'relative h-full w-full overflow-hidden rounded-xl ' + (className ?? '')}>
      <MapboxMap
        ref={mapRef}
        mapboxAccessToken={token}
        mapStyle={styleUrl}
        initialViewState={
          points.length > 0
            ? { bounds: computeBounds(points) ?? undefined, fitBoundsOptions: FIT_BOUNDS_OPTIONS }
            : fallbackBounds
              ? { bounds: fallbackBounds, fitBoundsOptions: FIT_BOUNDS_OPTIONS }
              : { longitude: -97.7431, latitude: 30.2672, zoom: 11 } // Austin fallback
        }
        reuseMaps
        attributionControl={false}
        style={{ width: '100%', height: '100%' }}
        aria-label="Map of results"
      >
        <NavigationControl position="top-right" showCompass={false} />
        {hits.map((b) => (
          <Marker key={b.id} longitude={b.lon} latitude={b.lat} anchor="bottom">
            <MapPinMarker
              name={b.name}
              href={`/${citySlug}/${categorySlug}/${b.slug}`}
              selected={selectedId === b.id}
              onActivate={() => router.push(`/${citySlug}/${categorySlug}/${b.slug}`)}
              onHoverChange={(h) => setHovered(h ? { id: b.id, lon: b.lon, lat: b.lat } : null)}
            />
          </Marker>
        ))}
        {hovered ? (
          <Popup
            longitude={hovered.lon}
            latitude={hovered.lat}
            anchor="bottom"
            offset={28}
            closeOnClick={false}
            closeOnMove={false}
          >
            <p className="text-foreground max-w-[16ch] truncate text-xs font-medium">
              {hits.find((h) => h.id === hovered.id)?.name ?? ''}
            </p>
          </Popup>
        ) : selectedId ? (
          <Popup
            longitude={hits.find((h) => h.id === selectedId)?.lon ?? 0}
            latitude={hits.find((h) => h.id === selectedId)?.lat ?? 0}
            anchor="bottom"
            offset={32}
            closeOnClick={false}
          >
            <p className="text-foreground max-w-[16ch] truncate text-xs font-medium">
              {hits.find((h) => h.id === selectedId)?.name ?? ''}
            </p>
          </Popup>
        ) : null}
      </MapboxMap>
      {points.length === 0 ? (
        <div className="bg-background/70 text-muted-foreground pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full px-3 py-1 text-[10px] tracking-wide uppercase backdrop-blur">
          No mappable results
        </div>
      ) : null}
      {/* selectedId is consumed (highlights the pin) even when not hovered */}
      <span className="sr-only" aria-live="polite">
        {selectedId ? `Selected: ${hits.find((h) => h.id === selectedId)?.name ?? ''}` : ''}
      </span>
    </div>
  );
}
