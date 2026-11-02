import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { loginUser } from '@/modules/authentication/authentication.service';
import { LoginSchema } from '@/modules/authentication/authentication.schema';
import { loginLimiter, getClientIp } from '@/lib/server/rate-limit.server';
import { logSecurityEvent } from '@/lib/server/security-events.server';
import logger from '@/lib/server/logger.server';

export async function POST(request: Request) {
  const _auth = await enforceRouteAuth('/api/authentication/login', 'POST');
  if (_auth instanceof NextResponse) return _auth;
  const ip = getClientIp(request);
  try {
    await loginLimiter.consume(ip);
  } catch {
    logSecurityEvent('RATE_LIMIT_HIT', { ip, route: '/api/authentication/login' });
    return NextResponse.json({ message: 'Too many login attempts. Please try again later.' }, { status: 429 });
  }

  try {
    const parsed = LoginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const { identifier, password } = parsed.data;
    const token = await loginUser(identifier, password);
    const response = NextResponse.json({ success: true, });
    response.cookies.set('polpal_token', token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 6,
      path: '/',
    });
    return response;
  } catch (error: unknown) {
    const msg: string = error instanceof Error ? error.message : '';
    if (msg === 'Please verify your email address before logging in.') {
      logSecurityEvent('AUTH_FAILURE', { ip, reason: 'email_not_verified' });
      return NextResponse.json({ message: msg }, { status: 403 });
    }
    if (msg === 'Your account is pending admin approval.') {
      logSecurityEvent('AUTH_FAILURE', { ip, reason: 'not_approved_by_admin' });
      return NextResponse.json({ message: msg }, { status: 403 });
    }
    if (msg === 'Invalid credentials') {
      logSecurityEvent('AUTH_FAILURE', { ip, reason: 'invalid_credentials' });
      return NextResponse.json({ message: 'Login failed' }, { status: 400 });
    }
    logger.error({ err: error }, 'POST /api/authentication/login failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
