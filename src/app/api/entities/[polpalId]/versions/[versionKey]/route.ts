import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntriesByVersionEntity } from '@/modules/entries/entries.service';
import logger from '@/lib/server/logger.server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ polpalId: string; versionKey: string }> }
) {
  const _auth = await enforceRouteAuth('/api/entities/[polpalId]/versions/[versionKey]', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const { polpalId, versionKey } = await params;
    const id = Number(polpalId);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid PolPaL ID' }, { status: 400 });
    const data = await getEntriesByVersionEntity(versionKey, id);
    if (!data) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/entities/[polpalId]/versions/[versionKey] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
