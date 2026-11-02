import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { registerUser } from '@/modules/authentication/authentication.service';
import { RegisterSchema } from '@/modules/authentication/authentication.schema';
import { registerLimiter, getClientIp } from '@/lib/server/rate-limit.server';
import { logSecurityEvent } from '@/lib/server/security-events.server';
import logger from '@/lib/server/logger.server';

export async function POST(request: Request) {
  const _auth = await enforceRouteAuth('/api/authentication/register', 'POST');
  if (_auth instanceof NextResponse) return _auth;
  const ip = getClientIp(request);
  try {
    await registerLimiter.consume(ip);
  } catch {
    logSecurityEvent('REGISTRATION_FLOOD', { ip, route: '/api/authentication/register' });
    return NextResponse.json({ message: 'Too many registration attempts. Please try again later.' }, { status: 429 });
  }

  try {
    const parsed = RegisterSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid registration data. Password must be at least 8 characters and include uppercase, lowercase, and a number' },
        { status: 400 }
      );
    }
    const { nameFirst, nameLast, email, username, password } = parsed.data;
    await registerUser(nameFirst, nameLast, email, username, password);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg: string = error instanceof Error ? error.message : '';
    if (msg === 'Username already exists') {
      return NextResponse.json({ message: msg }, { status: 409 });
    }
    logger.error({ err: error }, 'POST /api/authentication/register failed');
    return NextResponse.json({ message: 'Registration failed' }, { status: 500 });
  }
}
