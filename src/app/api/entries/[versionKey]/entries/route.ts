import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntriesByVersionPaginated } from '@/modules/entries/entries.service';
import logger from '@/lib/server/logger.server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ versionKey: string }> }
) {
  const _auth = await enforceRouteAuth('/api/entries/[versionKey]/entries', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const { versionKey } = await params;
    const data = await getEntriesByVersionPaginated(versionKey);
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/entries/[versionKey]/entries failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
