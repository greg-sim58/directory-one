import { NextResponse } from 'next/server';

// Phase 4: search is in-process against Postgres, so there is no
// separate index to rebuild. The route exists as a no-op so the
// vercel.json cron (weekly heartbeat) and any existing monitoring
// integration continue to work — Phase 5+ can repurpose it for
// other background work without changing the contract.

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // seconds — Vercel hint for background-ish jobs

export async function POST() {
  return NextResponse.json({
    ok: true,
    message: 'search engine is in-process; no reindex required',
    at: new Date().toISOString(),
  });
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: 'POST to trigger a no-op heartbeat' });
}
