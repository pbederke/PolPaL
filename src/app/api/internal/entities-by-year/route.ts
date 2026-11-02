import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntitiesByYear } from '@/modules/internal/internal.service';
import { getAuthPayload } from '@/lib/server/auth.server';
import logger from '@/lib/server/logger.server';

export async function GET() {
  const _auth = await enforceRouteAuth('/api/internal/entities-by-year', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const auth = await getAuthPayload();
    const data = await getEntitiesByYear(!!auth);
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/internal/entities-by-year failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
