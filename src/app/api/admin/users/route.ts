import { NextRequest, NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getUsersAdmin, createUserAdmin } from '@/modules/admin/admin.service';
import logger from '@/lib/server/logger.server';
import { CreateUserSchema } from '@/modules/admin/admin.schema';

export async function GET(request: NextRequest) {
  const auth = (await enforceRouteAuth('/api/admin/users', 'GET'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10));
    const take = 1000;
    const skip = (page - 1) * take;
    const { items, total } = await getUsersAdmin(skip, take);
    const pageCount = Math.ceil(total / take);
    return NextResponse.json({ items, total, page, pageCount });
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/admin/users failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = (await enforceRouteAuth('/api/admin/users', 'POST'))!;
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }
  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: 'Invalid input', errors: parsed.error.flatten() }, { status: 422 });
  try {
    const created = await createUserAdmin(parsed.data);
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    if (code === 'CONFLICT_USERNAME') return NextResponse.json({ message: 'Username is already taken.' }, { status: 409 });
    if (code === 'CONFLICT_EMAIL') return NextResponse.json({ message: 'Email is already in use.' }, { status: 409 });
    logger.error({ err: error }, 'POST /api/admin/users failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
