import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { updatePassword } from '@/modules/users/users.service';
import { PasswordChangeSchema } from '@/modules/authentication/authentication.schema';
import { passwordChangeLimiter, getClientIp } from '@/lib/server/rate-limit.server';
import { logSecurityEvent } from '@/lib/server/security-events.server';
import logger from '@/lib/server/logger.server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = (await enforceRouteAuth('/api/users/[userId]/password-change', 'PUT'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const { userId } = await params;
    const id = Number(userId);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 });
    if (auth.userId !== id) return NextResponse.json({ message: 'Forbidden: You can only change your own password' }, { status: 403 });
    try {
      await passwordChangeLimiter.consume(`password-change:${id}`);
    } catch {
      logSecurityEvent('RATE_LIMIT_HIT', { ip: getClientIp(request), userId: id, route: '/api/users/[userId]/password-change' });
      return NextResponse.json({ message: 'Too many attempts. Please try again later.' }, { status: 429 });
    }
    const parsed = PasswordChangeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters and include uppercase, lowercase, and a number' },
        { status: 400 }
      );
    }
    const result = await updatePassword(id, parsed.data.oldPassword, parsed.data.newPassword);
    if (!result) return NextResponse.json({ message: 'Error updating password' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Invalid credentials') {
      return NextResponse.json({ message: 'Current password is incorrect' }, { status: 400 });
    }
    logger.error({ err: error }, 'PUT /api/users/[userId]/password-change failed');
    return NextResponse.json({ message: 'Password change failed' }, { status: 500 });
  }
}
