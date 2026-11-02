import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { deleteEntriesByVersion, getEntriesForSync } from '@/modules/entries/entries.service';
import logger from '@/lib/server/logger.server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ versionKey: string }> }
) {
  const auth = await enforceRouteAuth('/api/entries/[versionKey]', 'GET');
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const { versionKey } = await params;
    const entries = await getEntriesForSync(versionKey);
    return NextResponse.json(entries, { status: 200 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/entries/[versionKey] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ versionKey: string }> }
) {
  const auth = await enforceRouteAuth('/api/entries/[versionKey]', 'DELETE');
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const { versionKey } = await params;
    await deleteEntriesByVersion(versionKey);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'DELETE /api/entries/[versionKey] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
