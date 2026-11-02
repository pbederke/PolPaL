import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntityFilters } from '@/modules/downloads/downloads.service';
import logger from '@/lib/server/logger.server';

export async function GET() {
  const _auth = await enforceRouteAuth('/api/downloads/entities/filters', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const filters = await getEntityFilters();
    return NextResponse.json(filters);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/downloads/entities/filters failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
