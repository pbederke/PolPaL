import { NextRequest, NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { updateUserAdmin, deleteUserAdmin } from '@/modules/admin/admin.service';
import logger from '@/lib/server/logger.server';
import { UpdateUserSchema } from '@/modules/admin/admin.schema';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ deleteUserId: string }> }
) {
  const auth = (await enforceRouteAuth('/api/admin/users/[deleteUserId]', 'PATCH'))!;
  if (auth instanceof NextResponse) return auth;
  const { deleteUserId } = await params;
  const id = Number(deleteUserId);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }
  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: 'Invalid input', errors: parsed.error.flatten() }, { status: 422 });
  try {
    const updated = await updateUserAdmin(id, parsed.data);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    if (code === 'CONFLICT_USERNAME') return NextResponse.json({ message: 'Username is already taken.' }, { status: 409 });
    if (code === 'CONFLICT_EMAIL') return NextResponse.json({ message: 'Email is already in use.' }, { status: 409 });
    logger.error({ err: error }, 'PATCH /api/admin/users/[id] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ deleteUserId: string }> }
) {
  const auth = (await enforceRouteAuth('/api/admin/users/[deleteUserId]', 'DELETE'))!;
  if (auth instanceof NextResponse) return auth;
  const { deleteUserId } = await params;
  const id = Number(deleteUserId);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 });
  try {
    await deleteUserAdmin(id);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if ((error as Error & { code?: string })?.code === 'P2025') return NextResponse.json({ message: 'User not found' }, { status: 404 });
    logger.error({ err: error }, 'DELETE /api/admin/users/[id] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
