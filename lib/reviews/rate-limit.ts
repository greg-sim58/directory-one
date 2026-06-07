import 'server-only';
import { enforceRateLimit } from '@/lib/map/rate-limit';

// Phase 7: per-IP and per-email rate limits for the submitReview action.
// Reuses the in-memory token-bucket in lib/map/rate-limit.ts (one bucket
// per key, per-instance — see its docstring for the production caveat).

const ONE_HOUR = 60 * 60 * 1000;
const IP_MAX = 10;
const EMAIL_MAX = 5;

export type SubmitRateLimit = { ok: true } | { ok: false; key: 'ip' | 'email'; resetAt: number };

export function checkSubmitRateLimits(ip: string, emailHash: string): SubmitRateLimit {
  const ipRes = enforceRateLimit(`submit:ip:${ip}`, IP_MAX, ONE_HOUR);
  if (!ipRes.ok) return { ok: false, key: 'ip', resetAt: ipRes.resetAt };
  const emailRes = enforceRateLimit(`submit:email:${emailHash}`, EMAIL_MAX, ONE_HOUR);
  if (!emailRes.ok) return { ok: false, key: 'email', resetAt: emailRes.resetAt };
  return { ok: true };
}
