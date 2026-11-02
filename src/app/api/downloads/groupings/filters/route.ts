import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getGroupingFilters } from '@/modules/downloads/downloads.service';
import logger from '@/lib/server/logger.server';

export async function GET() {
  const _auth = await enforceRouteAuth('/api/downloads/groupings/filters', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const filters = await getGroupingFilters();
    return NextResponse.json(filters);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/downloads/groupings/filters failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
