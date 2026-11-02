import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getGroupingsInCountries } from '@/modules/entities-in-countries/entities-in-countries.service';
import logger from '@/lib/server/logger.server';

export async function GET() {
  const _auth = await enforceRouteAuth('/api/entities-in-countries/groupings', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const data = await getGroupingsInCountries();
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/entities-in-countries/groupings failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
