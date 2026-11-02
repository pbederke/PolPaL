import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { createAutoLinksBulk } from '@/modules/links/links.service';
import logger from '@/lib/server/logger.server';
import { AutoLinkBodySchema } from '@/modules/links/links.schema';

const AUTO_LINK_USER_ID = 1;

export async function POST(request: Request) {
  const auth = await enforceRouteAuth('/api/links/auto-import', 'POST');
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const parsed = AutoLinkBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body', errors: parsed.error.issues }, { status: 400 });
    }
    const result = await createAutoLinksBulk(parsed.data, AUTO_LINK_USER_ID);
    return NextResponse.json({ created: result.created, batchId: result.batchId }, { status: 201 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'POST /api/links/auto-import failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
