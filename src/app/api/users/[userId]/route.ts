import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getUserById } from '@/modules/users/users.service';
import logger from '@/lib/server/logger.server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = (await enforceRouteAuth('/api/users/[userId]', 'GET'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const { userId } = await params;
    const id = parseInt(userId, 10);
    if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 });
    if (auth.userId !== id) return NextResponse.json({ message: 'Forbidden: You can only access your own user data' }, { status: 403 });
    const user = await getUserById(id);
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });
    return NextResponse.json(user);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/users/[userId] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
