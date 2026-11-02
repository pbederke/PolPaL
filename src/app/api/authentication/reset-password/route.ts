import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { resetPassword } from '@/modules/authentication/authentication.service';
import { ResetPasswordSchema } from '@/modules/authentication/authentication.schema';
import { loginLimiter, getClientIp } from '@/lib/server/rate-limit.server';
import { logSecurityEvent } from '@/lib/server/security-events.server';
import logger from '@/lib/server/logger.server';

export async function POST(request: Request) {
  const _auth = await enforceRouteAuth('/api/authentication/reset-password', 'POST');
  if (_auth instanceof NextResponse) return _auth;
  const ip = getClientIp(request);
  try {
    await loginLimiter.consume(ip);
  } catch {
    logSecurityEvent('RATE_LIMIT_HIT', { ip, route: '/api/authentication/reset-password' });
    return NextResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  try {
    const parsed = ResetPasswordSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }

    await resetPassword(parsed.data.token, parsed.data.password);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg: string = err instanceof Error ? err.message : '';
    if (msg === 'Invalid or expired password reset token.') {
      logSecurityEvent('AUTH_FAILURE', { ip, reason: 'invalid_reset_token' });
      return NextResponse.json({ message: msg }, { status: 400 });
    }
    logger.error({ err }, 'reset-password route error');
    return NextResponse.json({ message: 'An error occurred. Please try again.' }, { status: 500 });
  }
}
