import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

// Phase 1 stub. Phase 4 wires Meilisearch client + LRU cache + Zod-validated query.

const QuerySchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  category: z.string().optional(),
  filters: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    q: url.searchParams.get('q') ?? undefined,
    city: url.searchParams.get('city') ?? undefined,
    category: url.searchParams.get('category') ?? undefined,
    filters: url.searchParams.get('filters') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  return NextResponse.json(
    { hits: [], total: 0, query: parsed.data, note: 'search proxy stub' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
