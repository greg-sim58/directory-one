// Client-side cookie helpers for the `geo` and `loc` cookies. Server-side
// reads of these cookies go through `cookies()` in `lib/location.ts`.
// This file is intended to be imported from Client Components only — it
// touches `document.cookie` directly.

export type GeoCookie = {
  city: string;
  region?: string;
  country?: string;
  lat: number;
  lon: number;
  ts: number;
};

const ONE_YEAR_S = 60 * 60 * 24 * 365;

function writeCookie(name: string, value: string, maxAgeS: number): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeS}; samesite=lax`;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const target = `${name}=`;
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(target)) {
      return decodeURIComponent(trimmed.slice(target.length));
    }
  }
  return null;
}

export function setGeoCookie(data: GeoCookie): void {
  writeCookie('geo', encodeURIComponent(JSON.stringify(data)), ONE_YEAR_S);
}

export function readGeoCookie(): GeoCookie | null {
  const raw = readCookie('geo');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const p = parsed as Record<string, unknown>;
    if (typeof p.city !== 'string' || typeof p.lat !== 'number' || typeof p.lon !== 'number') {
      return null;
    }
    return {
      city: p.city,
      region: typeof p.region === 'string' ? p.region : undefined,
      country: typeof p.country === 'string' ? p.country : undefined,
      lat: p.lat,
      lon: p.lon,
      ts: typeof p.ts === 'number' ? p.ts : 0,
    };
  } catch {
    return null;
  }
}

export function setLocCookie(slug: string): void {
  writeCookie('loc', encodeURIComponent(slug), ONE_YEAR_S);
}

export function readLocCookie(): string | null {
  return readCookie('loc');
}

// The anonymous visitor id (`vid`) is set server-side by the
// saveLocationPreference action. This client read lets the home-page
// search reuse an existing id when persisting a preference.
export function readVisitorId(): string | null {
  return readCookie('vid');
}

export function hasResolvingCookie(): boolean {
  return readLocCookie() !== null || readGeoCookie() !== null;
}

export function deleteGeoCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = 'geo=; path=/; max-age=0; samesite=lax';
}
