import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntriesWithLinksForMatching } from '@/modules/entries/entries.service';
import logger from '@/lib/server/logger.server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ versionKey: string }> }
) {
  const auth = await enforceRouteAuth('/api/entries/[versionKey]/with-links', 'GET');
  if (auth instanceof NextResponse) return auth;
  try {
    const { versionKey } = await params;
    const data = await getEntriesWithLinksForMatching(versionKey);
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/entries/[versionKey]/with-links failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
