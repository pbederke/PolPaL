import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { deleteReferenceAdmin } from '@/modules/admin/admin.service';
import logger from '@/lib/server/logger.server';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ deleteReferenceId: string }> }
) {
  const auth = (await enforceRouteAuth('/api/admin/references/[deleteReferenceId]', 'DELETE'))!;
  if (auth instanceof NextResponse) return auth;
  const { deleteReferenceId } = await params;
  const id = Number(deleteReferenceId);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid reference ID' }, { status: 400 });
  try {
    let comment: string | undefined;
    try { const b = await request.json(); if (typeof b?.comment === 'string') comment = b.comment.trim().slice(0, 1000) || undefined; } catch { /* no body */ }
    await deleteReferenceAdmin(id, auth.userId, comment);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof Error && (error as Error & { code?: string }).code === 'P2025') return NextResponse.json({ message: 'Reference not found' }, { status: 404 });
    logger.error({ err: error }, 'DELETE /api/admin/references/[id] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
