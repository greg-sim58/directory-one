// Mapbox style + token configuration. Light by default, dark under
// `prefers-color-scheme: dark`. The `light-v11` style is significantly
// cheaper to render (fewer labels, no 3D buildings) than `streets-v12`
// and feels editorial — appropriate for a directory.
//
// `NEXT_PUBLIC_MAPBOX_TOKEN` is the public, browser-safe token. The
// server uses `MAPBOX_SECRET_TOKEN` for /api/geocode only.

export const MAPBOX_STYLE_LIGHT = 'mapbox://styles/mapbox/light-v11';
export const MAPBOX_STYLE_DARK = 'mapbox://styles/mapbox/dark-v11';

export function getMapboxToken(): string | null {
  const t = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';
  return t ? t : null;
}

export function getMapboxStyle(): string {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? MAPBOX_STYLE_DARK
      : MAPBOX_STYLE_LIGHT;
  }
  return MAPBOX_STYLE_LIGHT;
}
