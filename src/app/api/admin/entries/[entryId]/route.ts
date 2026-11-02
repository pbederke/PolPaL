import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { deleteEntryAdmin } from '@/modules/admin/admin.service';
import logger from '@/lib/server/logger.server';

export async function DELETE(_req: Request, { params }: { params: Promise<{ entryId: string }> }) {
  const auth = (await enforceRouteAuth('/api/admin/entries/[entryId]', 'DELETE'))!;
  if (auth instanceof NextResponse) return auth;
  const { entryId } = await params;
  const id = parseInt(entryId, 10);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
  try {
    await deleteEntryAdmin(id);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    const e = error as { code?: string };
    if (e.code === 'P2003' || e.code === 'P2014') {
      return NextResponse.json({ message: 'Cannot delete: record has dependent data.' }, { status: 409 });
    }
    if (e.code === 'P2025') return NextResponse.json({ message: 'Not found' }, { status: 404 });
    logger.error({ err: error }, 'DELETE /api/admin/entries/[entryId] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
