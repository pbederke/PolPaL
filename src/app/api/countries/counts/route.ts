import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getCountriesWithCounts } from '@/modules/countries/countries.service';
import logger from '@/lib/server/logger.server';

export async function GET() {
  const _auth = await enforceRouteAuth('/api/countries/counts', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const data = await getCountriesWithCounts();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/countries/counts failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
