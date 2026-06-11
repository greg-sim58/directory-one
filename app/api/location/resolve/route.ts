import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getCachedResolve, setCachedResolve, type ResolveCandidate } from '@/lib/cache';
import { enforceRateLimit, getClientIp } from '@/lib/map/rate-limit';

// Reverse geocoding with the richer shape the auto-prompt + manual picker
// need (city + region + country + up to 5 nearest candidates). Backed by
// Mapbox; same LRU cache and 10/min/IP rate limit as `/api/geocode`. Kept
// as a separate route so the existing `/api/geocode` callers (forward +
// reverse for the search bar and map) keep their narrow shape.

const MAPBOX_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

let warnedAboutMissingToken = false;

const QuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

type MapboxContext = { id: string; text: string; short_code?: string };
type MapboxFeature = {
  text: string;
  place_name: string;
  context?: MapboxContext[];
};

function pickContext(
  context: MapboxContext[] | undefined,
  idPrefix: string,
): { text?: string; shortCode?: string } {
  if (!context) return {};
  const hit = context.find((c) => c.id.startsWith(idPrefix));
  return hit ? { text: hit.text, shortCode: hit.short_code } : {};
}

function pickCandidates(features: MapboxFeature[], lat: number, lon: number): ResolveCandidate[] {
  return features.map((f) => {
    const region = pickContext(f.context, 'region');
    const country = pickContext(f.context, 'country');
    return {
      city: f.text,
      region: region.text,
      country: country.shortCode ?? country.text,
      lat,
      lon,
    };
  });
}

async function resolve(lat: number, lon: number) {
  const key = `resolve:${lat.toFixed(4)},${lon.toFixed(4)}`;
  const cached = getCachedResolve(key);
  if (cached && cached.candidates.length > 0) {
    return { candidates: cached.candidates, cached: true };
  }

  const token = process.env.MAPBOX_SECRET_TOKEN;
  if (!token) {
    if (!warnedAboutMissingToken) {
      warnedAboutMissingToken = true;
      console.warn(
        '[location/resolve] MAPBOX_SECRET_TOKEN is not set. Geolocation will return an empty candidate list. Add a token to .env to enable the "Towns near you" picker.',
      );
    }
    return { candidates: [], degraded: true, cached: false };
  }

  // `types=place&limit=5` returns up to 5 place features (cities/towns)
  // sorted by proximity, each with its own region/country chain in the
  // `context` array. The closest match is the first feature.
  const url = `${MAPBOX_BASE}/${lon},${lat}.json?access_token=${token}` + `&limit=5&types=place`;
  const res = await fetch(url, { next: { revalidate: 600 } });
  if (!res.ok) {
    return NextResponse.json({ error: `Mapbox ${res.status}` }, { status: 502 });
  }
  const data = (await res.json()) as { features: MapboxFeature[] };
  if (!data.features || data.features.length === 0) {
    return NextResponse.json({ error: 'no results' }, { status: 404 });
  }

  const candidates = pickCandidates(data.features, lat, lon);
  setCachedResolve(key, { candidates });
  return { candidates, degraded: false, cached: false };
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = enforceRateLimit(`geocode:${ip}`, 10, 60_000);
  if (!limit.ok) {
    const retryAfter = Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many location requests. Try again shortly.' },
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
    lat: url.searchParams.get('lat') ?? undefined,
    lon: url.searchParams.get('lon') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { lat, lon } = parsed.data;
  const result = await resolve(lat, lon);
  if (result instanceof NextResponse) return result;
  // Degraded path: no Mapbox token configured. Return 200 with an empty
  // candidate list so the client can show a helpful "not configured" UI
  // without surfacing a 503 in dev logs.
  if (result.degraded) {
    return NextResponse.json(
      { candidates: [], degraded: true },
      {
        headers: {
          'Cache-Control': 'no-store',
          'X-RateLimit-Remaining': String(limit.remaining),
          'X-RateLimit-Reset': String(Math.floor(limit.resetAt / 1000)),
        },
      },
    );
  }
  // Back-compat: top-level fields reflect the closest candidate.
  const top = result.candidates[0];
  return NextResponse.json(
    { ...top, candidates: result.candidates },
    {
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=600',
        'X-RateLimit-Remaining': String(limit.remaining),
        'X-RateLimit-Reset': String(Math.floor(limit.resetAt / 1000)),
      },
    },
  );
}
