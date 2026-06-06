// Mapbox style + token configuration. Light only (we don't auto-swap
// to a dark style under `prefers-color-scheme: dark` — the directory
// app's chrome is light and the map should match). The `light-v11`
// style is significantly cheaper to render (fewer labels, no 3D
// buildings) than `streets-v12` and feels editorial.
//
// `NEXT_PUBLIC_MAPBOX_TOKEN` is the public, browser-safe token. The
// server uses `MAPBOX_SECRET_TOKEN` for /api/geocode only.

export const MAPBOX_STYLE_LIGHT = 'mapbox://styles/mapbox/light-v11';

export function getMapboxToken(): string | null {
  const t = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';
  return t ? t : null;
}
