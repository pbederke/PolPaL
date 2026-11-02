import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getGroupedEntriesByCountry } from '@/modules/entries/entries.service';
import logger from '@/lib/server/logger.server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ versionKey: string }> }
) {
  const _auth = await enforceRouteAuth('/api/entries/countries/[versionKey]', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const { versionKey } = await params;
    if (!versionKey) return NextResponse.json({ message: 'Version key is required' }, { status: 400 });
    const data = await getGroupedEntriesByCountry(versionKey);
    if (!data) return NextResponse.json({ message: 'Version not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/entries/countries/[versionKey] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
