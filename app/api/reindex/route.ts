import { NextResponse, type NextRequest } from 'next/server';

// Phase 1 stub. Phase 4 wires Meilisearch index sync (called by cron).
// Protected by a shared secret in production; the cron header is checked here.

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (
    auth !== `Bearer ${process.env.REINDEX_SECRET ?? ''}` &&
    process.env.NODE_ENV === 'production'
  ) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ note: 'reindex stub' });
}

export async function GET() {
  return NextResponse.json({ note: 'reindex stub — use POST' });
}
