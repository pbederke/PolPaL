import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { deleteLinkByEntry } from '@/modules/links/links.service';
import logger from '@/lib/server/logger.server';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ uniqueObservationId: string }> }
) {
  const auth = (await enforceRouteAuth('/api/links/by-entry/[uniqueObservationId]', 'DELETE'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const { uniqueObservationId } = await params;
    if (!uniqueObservationId) return NextResponse.json({ message: 'uniqueObservationId is required' }, { status: 400 });
    await deleteLinkByEntry(uniqueObservationId, auth.userId);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'DELETE /api/links/by-entry/[id] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
