import 'server-only';

// Per PLAN.md §5 geo strategy: distance, bbox, and geohash helpers.
// Full implementation lands in Phase 2 alongside the PostGIS-backed queries.

export const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export type Bbox = {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
};

export function bboxAround(center: { lat: number; lon: number }, radiusKm: number): Bbox {
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos((center.lat * Math.PI) / 180));
  return {
    minLat: center.lat - latDelta,
    minLon: center.lon - lonDelta,
    maxLat: center.lat + latDelta,
    maxLon: center.lon + lonDelta,
  };
}
