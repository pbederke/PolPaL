import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { deleteEntityChange, updateEntityChange } from '@/modules/entity-changes/entity-changes.service';
import { EntityChangeUpdateSchema } from '@/modules/entity-changes/entity-changes.schema';
import logger from '@/lib/server/logger.server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ entityChangeId: string }> }
) {
  const auth = (await enforceRouteAuth('/api/entity-changes/[entityChangeId]', 'PATCH'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const { entityChangeId } = await params;
    const id = Number(entityChangeId);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid entity change ID' }, { status: 400 });

    const parsed = EntityChangeUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const body = parsed.data;
    const result = await updateEntityChange(id, auth.userId, {
      changeYear: body.changeYear,
      changeMonth: body.changeMonth ?? null,
      changeDay: body.changeDay ?? null,
      comment: body.comment ?? null,
    });
    return NextResponse.json(result);
  } catch (error: unknown) {
    logger.error({ err: error }, 'PATCH /api/entity-changes/[id] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ entityChangeId: string }> }
) {
  const auth = (await enforceRouteAuth('/api/entity-changes/[entityChangeId]', 'DELETE'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const { entityChangeId } = await params;
    const id = Number(entityChangeId);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid entity change ID' }, { status: 400 });
    let comment: string | undefined;
    try { const b = await request.json(); if (typeof b?.comment === 'string') comment = b.comment.trim().slice(0, 1000) || undefined; } catch { /* no body */ }
    await deleteEntityChange(id, auth.userId, comment);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'DELETE /api/entity-changes/[id] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
