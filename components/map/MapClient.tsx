'use client';

import dynamic from 'next/dynamic';

import type { BusinessDoc } from '@/lib/validation';
import type { LngLatBounds } from '@/lib/map/bounds';
import { MapRegionSkeleton } from './skeletons/MapRegionSkeleton';

// 'use client' wrapper that lazy-loads the actual Mapbox component.
// `next/dynamic({ ssr: false })` is the documented pattern for keeping
// mapbox-gl out of the RSC bundle; per Next 16 docs it must be called
// from a Client Component, so this file is the boundary.
//
// The page (an RSC) imports THIS component, never the mapbox file
// directly. Suspense fallback is `<MapRegionSkeleton />`.

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => <MapRegionSkeleton />,
});

type Props = {
  hits: BusinessDoc[];
  citySlug: string;
  categorySlug: string;
  fallbackBounds?: LngLatBounds;
  className?: string;
};

export function MapClient(props: Props) {
  return <MapView {...props} />;
}
