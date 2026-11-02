import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { requestPasswordReset } from '@/modules/authentication/authentication.service';
import { ForgotPasswordSchema } from '@/modules/authentication/authentication.schema';
import { passwordResetLimiter, getClientIp } from '@/lib/server/rate-limit.server';
import { logSecurityEvent } from '@/lib/server/security-events.server';
import logger from '@/lib/server/logger.server';

export async function POST(request: Request) {
  const _auth = await enforceRouteAuth('/api/authentication/forgot-password', 'POST');
  if (_auth instanceof NextResponse) return _auth;
  const ip = getClientIp(request);
  try {
    await passwordResetLimiter.consume(ip);
  } catch {
    logSecurityEvent('RATE_LIMIT_HIT', { ip, route: '/api/authentication/forgot-password' });
    return NextResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  try {
    const parsed = ForgotPasswordSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }

    // Always returns silently to prevent email enumeration
    await requestPasswordReset(parsed.data.email);

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'forgot-password route error');
    return NextResponse.json({ message: 'An error occurred. Please try again.' }, { status: 500 });
  }
}
