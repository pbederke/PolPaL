import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntitiesForLinking } from '@/modules/entities-in-countries/entities-in-countries.service';
import { getAuthPayload } from '@/lib/server/auth.server';
import logger from '@/lib/server/logger.server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ countrycodePolpal: string }> }
) {
  const _auth = await enforceRouteAuth('/api/entities-in-countries/entities/[countrycodePolpal]', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const { countrycodePolpal } = await params;
    const authResult = await getAuthPayload();
    const isLoggedIn = authResult !== null;
    const data = await getEntitiesForLinking(countrycodePolpal, isLoggedIn);
    if (!data) return NextResponse.json({ message: 'No entities found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/entities-in-countries/entities/[countrycodePolpal] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
