import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntityReferences } from '@/modules/references/references.service';
import logger from '@/lib/server/logger.server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ polpalId: string }> },
) {
  const _auth = await enforceRouteAuth('/api/references/entities/[polpalId]', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const { polpalId } = await params;
    const id = parseInt(polpalId, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ message: 'Invalid polpalId' }, { status: 400 });
    }
    const data = await getEntityReferences(id);
    return NextResponse.json(data);
  } catch (error) {
    logger.error({ err: error }, 'GET /api/references/entities/[polpalId] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
