import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getStats } from '@/modules/internal/internal.service';
import { getAuthPayload } from '@/lib/server/auth.server';
import logger from '@/lib/server/logger.server';

export async function GET() {
  const _auth = await enforceRouteAuth('/api/internal/statistics', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const auth = await getAuthPayload();
    const isLoggedIn = !!auth;
    const stats = await getStats(isLoggedIn);
    if (!stats) return NextResponse.json({ message: 'Stats not found' }, { status: 404 });
    return NextResponse.json(stats);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/internal/statistics failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
