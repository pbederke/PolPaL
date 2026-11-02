import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getVersionEntries } from '@/modules/versions/versions.service';
import logger from '@/lib/server/logger.server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ versionKey: string }> }
) {
  const _auth = await enforceRouteAuth('/api/versions/[versionKey]/entries', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const { versionKey } = await params;
    const data = await getVersionEntries(versionKey);
    if (!data) return NextResponse.json({ message: 'Version not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/versions/[versionKey]/entries failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
