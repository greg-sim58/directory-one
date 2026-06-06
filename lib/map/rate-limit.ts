// In-memory token-bucket rate limiter, per-instance.
//
// CAVEAT: on Vercel serverless each instance has its own `Map`, so the
// effective limit is `max * instances` across the global deployment.
// For an MVP-scale directory (50 businesses, low traffic) this is fine
// and saves the cost of an Upstash / Vercel KV dependency. Swap to a
// shared store before public launch.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Periodic cleanup so the map doesn't grow unbounded in long-lived
// processes. 5 minutes is the smallest unit we need to track.
const SWEEP_MS = 5 * 60 * 1000;
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < SWEEP_MS) return;
  for (const [k, b] of buckets) {
    if (b.resetAt < now) buckets.delete(k);
  }
  lastSweep = now;
}

export type RateLimitResult = { ok: true; remaining: number; resetAt: number } | {
  ok: false;
  remaining: 0;
  resetAt: number;
};

export function enforceRateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: max - 1, resetAt };
  }
  if (b.count >= max) {
    return { ok: false, remaining: 0, resetAt: b.resetAt };
  }
  b.count += 1;
  return { ok: true, remaining: max - b.count, resetAt: b.resetAt };
}

// Read the client IP from Vercel-set headers, with fallbacks. Returns
// "unknown" if neither is present (we still bucket by that key, so
// unkeyed traffic shares a single bucket — safe, just coarser).
export function getClientIp(request: Request): string {
  const h = request.headers;
  return (
    h.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip')?.trim() ||
    'unknown'
  );
}
