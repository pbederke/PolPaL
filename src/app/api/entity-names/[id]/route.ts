import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntityNamesByPolpalId, deleteEntityName, updateEntityName } from '@/modules/entity-names/entity-names.service';
import { EntityNameUpdateSchema } from '@/modules/entity-names/entity-names.schema';
import logger from '@/lib/server/logger.server';

// GET /api/entity-names/[id] -> get by polpalId
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const _auth = await enforceRouteAuth('/api/entity-names/[id]', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const { id } = await params;
    const polpalId = Number(id);
    if (!Number.isInteger(polpalId) || polpalId <= 0) return NextResponse.json({ message: 'Invalid PolPaL ID' }, { status: 400 });
    const data = await getEntityNamesByPolpalId(polpalId);
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/entity-names/[id] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/entity-names/[id] -> delete by entityNameId
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = (await enforceRouteAuth('/api/entity-names/[id]', 'DELETE'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const entityNameId = Number(id);
    if (!Number.isInteger(entityNameId) || entityNameId <= 0) return NextResponse.json({ message: 'Invalid entity name ID' }, { status: 400 });
    let comment: string | undefined;
    try { const b = await request.json(); if (typeof b?.comment === 'string') comment = b.comment.trim().slice(0, 1000) || undefined; } catch { /* no body */ }
    await deleteEntityName(entityNameId, auth.userId, comment);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'DELETE /api/entity-names/[id] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/entity-names/[id] -> update entity name by entityNameId
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = (await enforceRouteAuth('/api/entity-names/[id]', 'PATCH'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const entityNameId = Number(id);
    if (!Number.isInteger(entityNameId) || entityNameId <= 0) return NextResponse.json({ message: 'Invalid entity name ID' }, { status: 400 });

    const parsed = EntityNameUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const result = await updateEntityName(entityNameId, auth.userId, parsed.data);
    return NextResponse.json(result);
  } catch (error: unknown) {
    logger.error({ err: error }, 'PATCH /api/entity-names/[id] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
