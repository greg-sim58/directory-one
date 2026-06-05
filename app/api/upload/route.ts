import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';

// Phase 1 stub. Phase 6 wires Vercel Blob signed URLs + business-ownership check.

const BodySchema = z.object({
  filename: z.string().min(1).max(256),
  contentType: z.string().min(1).max(128),
  businessId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  return NextResponse.json(
    { note: 'upload stub', filename: parsed.data.filename },
    { status: 201 },
  );
}
