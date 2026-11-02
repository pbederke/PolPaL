import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getLinksByPolPalId } from '@/modules/links/links.service';
import logger from '@/lib/server/logger.server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ polpalId: string }> }
) {
  const auth = await enforceRouteAuth('/api/links/polpalId/[polpalId]', 'GET');
  if (auth instanceof NextResponse) return auth;
  try {
    const { polpalId } = await params;
    const id = Number(polpalId);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid PolPaL ID' }, { status: 400 });
    const data = await getLinksByPolPalId(id);
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/links/polpalId/[polpalId] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
