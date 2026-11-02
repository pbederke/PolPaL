import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getUnknownEntries } from '@/modules/entries/entries.service';
import logger from '@/lib/server/logger.server';

export async function GET() {
  const _auth = await enforceRouteAuth('/api/entries/unknown-entries', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const data = await getUnknownEntries();
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/entries/unknown-entries failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
