import { NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/server/auth.server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntityByPolpalId, deleteEntity, updateEntity } from '@/modules/entities/entities.service';
import { EntityUpdateSchema } from '@/modules/entities/entities.schema';
import logger from '@/lib/server/logger.server';
import { RoleEnum } from '@/lib/shared/enums';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ polpalId: string }> }
) {
  const _auth = await enforceRouteAuth('/api/entities/[polpalId]', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const { polpalId } = await params;
    const id = Number(polpalId);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid PolPaL ID' }, { status: 400 });
    const auth = await getAuthPayload();
    const data = await getEntityByPolpalId(id, !!auth);
    if (!data) return NextResponse.json({ message: 'Entity not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/entities/[polpalId] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ polpalId: string }> }
) {
  const auth = (await enforceRouteAuth('/api/entities/[polpalId]', 'DELETE'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const { polpalId } = await params;
    const id = Number(polpalId);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid PolPaL ID' }, { status: 400 });

    // Optional deletion reason supplied by the user in the confirm dialog.
    let comment: string | undefined;
    try {
      const body = await request.json();
      if (typeof body?.comment === 'string') comment = body.comment.trim().slice(0, 1000) || undefined;
    } catch {
      // no body — fine
    }

    await deleteEntity(id, auth.userId, auth.role as RoleEnum, comment);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof Error && (error as Error & { code?: string }).code === 'FORBIDDEN') return NextResponse.json({ message: error.message }, { status: 403 });
    logger.error({ err: error }, 'DELETE /api/entities/[polpalId] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ polpalId: string }> }
) {
  const auth = (await enforceRouteAuth('/api/entities/[polpalId]', 'PUT'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const { polpalId } = await params;
    const id = Number(polpalId);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid PolPaL ID' }, { status: 400 });
    const parsed = EntityUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const updated = await updateEntity(auth.userId, id, parsed.data);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    logger.error({ err: error }, 'PUT /api/entities/[polpalId] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
