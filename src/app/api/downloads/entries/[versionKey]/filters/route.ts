import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntryFiltersForVersion } from '@/modules/downloads/downloads.service';
import logger from '@/lib/server/logger.server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ versionKey: string }> }
) {
  const _auth = await enforceRouteAuth('/api/downloads/entries/[versionKey]/filters', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  const { versionKey } = await params;
  if (!versionKey) {
    return NextResponse.json({ message: 'versionKey is required' }, { status: 400 });
  }
  try {
    const filters = await getEntryFiltersForVersion(versionKey);
    return NextResponse.json(filters);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/downloads/entries/[versionKey]/filters failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
