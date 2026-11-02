import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntriesByVersionCountryAggregated } from '@/modules/entries/entries.service';
import logger from '@/lib/server/logger.server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ versionKey: string; countrycodePolpal: string }> }
) {
  const _auth = await enforceRouteAuth('/api/entries/by-version-and-country-aggregated/[versionKey]/[countrycodePolpal]', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const { versionKey, countrycodePolpal } = await params;
    const data = await getEntriesByVersionCountryAggregated(versionKey, countrycodePolpal);
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/entries/by-version-and-country-aggregated failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
