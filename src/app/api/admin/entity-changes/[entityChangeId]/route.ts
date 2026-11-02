import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { deleteEntityChangeAdmin } from '@/modules/admin/admin.service';
import logger from '@/lib/server/logger.server';

export async function DELETE(request: Request, { params }: { params: Promise<{ entityChangeId: string }> }) {
  const auth = (await enforceRouteAuth('/api/admin/entity-changes/[entityChangeId]', 'DELETE'))!;
  if (auth instanceof NextResponse) return auth;
  const { entityChangeId } = await params;
  const id = parseInt(entityChangeId, 10);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
  try {
    let comment: string | undefined;
    try { const b = await request.json(); if (typeof b?.comment === 'string') comment = b.comment.trim().slice(0, 1000) || undefined; } catch { /* no body */ }
    await deleteEntityChangeAdmin(id, auth.userId, comment);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    const e = error as { code?: string };
    if (e.code === 'P2003' || e.code === 'P2014') {
      return NextResponse.json({ message: 'Cannot delete: record has dependent data.' }, { status: 409 });
    }
    if (e.code === 'P2025') return NextResponse.json({ message: 'Not found' }, { status: 404 });
    logger.error({ err: error }, 'DELETE /api/admin/entity-changes/[entityChangeId] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
