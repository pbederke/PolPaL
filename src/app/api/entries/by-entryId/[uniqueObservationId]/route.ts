import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntryByEntryId } from '@/modules/entries/entries.service';
import logger from '@/lib/server/logger.server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uniqueObservationId: string }> }
) {
  const _auth = await enforceRouteAuth('/api/entries/by-entryId/[uniqueObservationId]', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const { uniqueObservationId: entryId } = await params;
    const id = Number(entryId);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid entry ID' }, { status: 400 });
    const data = await getEntryByEntryId(id);
    if (!data) return NextResponse.json({ message: 'Entry not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/entries/by-entryId/[id] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
