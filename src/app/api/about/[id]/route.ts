import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { deleteAbout, updateAbout } from '@/modules/about/about.service';
import { AboutUpdateSchema } from '@/modules/about/about.schema';
import logger from '@/lib/server/logger.server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await enforceRouteAuth('/api/about/[id]', 'PATCH');
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId <= 0) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
    const parsed = AboutUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const updated = await updateAbout(numId, parsed.data);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    logger.error({ err: error }, 'PATCH /api/about/[id] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await enforceRouteAuth('/api/about/[id]', 'DELETE');
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId <= 0) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
    await deleteAbout(numId);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'DELETE /api/about/[id] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
