import { NextResponse, type NextRequest } from 'next/server';
import { searchBusinesses } from '@/lib/search/queries';

// Phase 4: server-side search proxy. Zod is applied inside
// searchBusinesses (lib/search/queries.ts) so the same schema validates
// both this route and the RSC call site.

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const params: Record<string, string> = {};
  for (const [k, v] of url.searchParams.entries()) {
    params[k] = v;
  }

  const result = await searchBusinesses(params);

  return NextResponse.json(result, {
    headers: {
      // Vercel edge cache: 60s fresh, 5min stale-while-revalidate.
      // The Drizzle query under the hood is fast, but identical
      // requests from the SWR client in /[city]/[category] still
      // benefit from the shared cache.
      'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
