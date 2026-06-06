// Pure bounding-box helpers. `react-map-gl`'s `fitBounds` takes a
// `LngLatBoundsLike` — `[sw, ne]` with `[lon, lat]` tuples.

export type LngLat = [number, number]; // [lon, lat]
export type LngLatBounds = [LngLat, LngLat]; // [sw, ne]

export function computeBounds(points: LngLat[]): LngLatBounds | null {
  if (points.length === 0) return null;
  let minLon = points[0]![0];
  let minLat = points[0]![1];
  let maxLon = minLon;
  let maxLat = minLat;
  for (const [lon, lat] of points) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  // Collapse a degenerate (single-point) bounds into a tiny square so
  // the map zooms sensibly to that location.
  if (minLon === maxLon && minLat === maxLat) {
    const d = 0.005;
    return [
      [minLon - d, minLat - d],
      [maxLon + d, maxLat + d],
    ];
  }
  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
}

// Does `bounds` (the current view) contain at least one of `points`?
// Cheap O(n) check — fine for ≤ ~500 results.
export function boundsContainAny(bounds: LngLatBounds | null, points: LngLat[]): boolean {
  if (!bounds) return false;
  const [[minLon, minLat], [maxLon, maxLat]] = bounds;
  for (const [lon, lat] of points) {
    if (lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat) return true;
  }
  return false;
}
