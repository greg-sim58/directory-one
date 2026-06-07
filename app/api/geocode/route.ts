import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getCachedGeocode, setCachedGeocode } from '@/lib/cache';
import { enforceRateLimit, getClientIp } from '@/lib/map/rate-limit';

// Phase 3: real Mapbox forward + reverse geocoding, LRU-cached for 10 minutes.
// The token is server-only (`MAPBOX_SECRET_TOKEN`); the public token stays
// on the client for Mapbox GL rendering.
//
// Phase 5: per-IP rate limit (10 req/min) to bound Mapbox spend. The
// limiter is in-memory and per-instance; see lib/map/rate-limit.ts for
// the production caveat.

const MAPBOX_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

const QuerySchema = z.object({
  q: z.string().min(1).max(256).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
});

type MapboxFeature = {
  place_name: string;
  text: string;
  center: [number, number]; // [lon, lat]
  context?: { id: string; text: string; short_code?: string }[];
};

async function geocodeForward(q: string) {
  const cached = getCachedGeocode(q);
  if (cached) return { ...cached, cached: true };

  const token = process.env.MAPBOX_SECRET_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'MAPBOX_SECRET_TOKEN is not configured' }, { status: 503 });
  }

  const url = `${MAPBOX_BASE}/${encodeURIComponent(q)}.json?access_token=${token}&limit=1`;
  const res = await fetch(url, { next: { revalidate: 600 } });
  if (!res.ok) {
    return NextResponse.json({ error: `Mapbox ${res.status}` }, { status: 502 });
  }
  const data = (await res.json()) as { features: MapboxFeature[] };
  const feature = data.features[0];
  if (!feature) {
    return NextResponse.json({ error: 'no results' }, { status: 404 });
  }
  const [lon, lat] = feature.center;
  const result = { lat, lon, city: feature.text };
  setCachedGeocode(q, result);
  return { ...result, cached: false };
}

async function geocodeReverse(lat: number, lon: number) {
  const key = `rev:${lat.toFixed(4)},${lon.toFixed(4)}`;
  const cached = getCachedGeocode(key);
  if (cached) return { ...cached, cached: true };

  const token = process.env.MAPBOX_SECRET_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'MAPBOX_SECRET_TOKEN is not configured' }, { status: 503 });
  }

  const url = `${MAPBOX_BASE}/${lon},${lat}.json?access_token=${token}&limit=1&types=place`;
  const res = await fetch(url, { next: { revalidate: 600 } });
  if (!res.ok) {
    return NextResponse.json({ error: `Mapbox ${res.status}` }, { status: 502 });
  }
  const data = (await res.json()) as { features: MapboxFeature[] };
  const feature = data.features[0];
  if (!feature) {
    return NextResponse.json({ error: 'no results' }, { status: 404 });
  }
  const result = { lat, lon, city: feature.text };
  setCachedGeocode(key, result);
  return { ...result, cached: false };
}

export async function GET(request: NextRequest) {
  // Rate limit first — reject before doing any parsing or upstream work.
  const ip = getClientIp(request);
  const limit = enforceRateLimit(`geocode:${ip}`, 10, 60_000);
  if (!limit.ok) {
    const retryAfter = Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many geocode requests. Try again shortly.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(limit.resetAt / 1000)),
        },
      },
    );
  }

  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    q: url.searchParams.get('q') ?? undefined,
    lat: url.searchParams.get('lat') ?? undefined,
    lon: url.searchParams.get('lon') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { q, lat, lon } = parsed.data;
  const result =
    lat !== undefined && lon !== undefined
      ? await geocodeReverse(lat, lon)
      : q
        ? await geocodeForward(q)
        : NextResponse.json({ error: 'q or lat/lon required' }, { status: 400 });

  if (result instanceof NextResponse) return result;
  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=600',
      'X-RateLimit-Remaining': String(limit.remaining),
      'X-RateLimit-Reset': String(Math.floor(limit.resetAt / 1000)),
    },
  });
}
