import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { deleteReference, updateReference } from '@/modules/references/references.service';
import { ReferenceUpdateSchema } from '@/modules/references/references.schema';
import logger from '@/lib/server/logger.server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ referenceId: string }> },
) {
  const auth = (await enforceRouteAuth('/api/references/[referenceId]', 'PATCH'))!;
  if (auth instanceof NextResponse) return auth;

  try {
    const { referenceId } = await params;
    const id = parseInt(referenceId, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ message: 'Invalid referenceId' }, { status: 400 });
    }
    const parsed = ReferenceUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const result = await updateReference(id, parsed.data, auth.userId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Reference not found') {
      return NextResponse.json({ message: 'Reference not found' }, { status: 404 });
    }
    logger.error({ err: error }, 'PATCH /api/references/[referenceId] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ referenceId: string }> },
) {
  const auth = (await enforceRouteAuth('/api/references/[referenceId]', 'DELETE'))!;
  if (auth instanceof NextResponse) return auth;

  try {
    const { referenceId } = await params;
    const id = parseInt(referenceId, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ message: 'Invalid referenceId' }, { status: 400 });
    }
    let comment: string | undefined;
    try { const b = await request.json(); if (typeof b?.comment === 'string') comment = b.comment.trim().slice(0, 1000) || undefined; } catch { /* no body */ }
    await deleteReference(id, auth.userId, comment);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Reference not found') {
      return NextResponse.json({ message: 'Reference not found' }, { status: 404 });
    }
    logger.error({ err: error }, 'DELETE /api/references/[referenceId] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
