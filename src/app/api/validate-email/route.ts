import disposableEmailDetector from "disposable-email-detector";
import { NextResponse } from "next/server";
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { ValidateEmailSchema } from '@/modules/authentication/authentication.schema';
import logger from '@/lib/server/logger.server';
import { validateEmailLimiter, getClientIp } from '@/lib/server/rate-limit.server';
import { logSecurityEvent } from '@/lib/server/security-events.server';

export async function POST(req: Request) {
  const _auth = await enforceRouteAuth('/api/validate-email', 'POST');
  if (_auth instanceof NextResponse) return _auth;
  const ip = getClientIp(req);
  try {
    await validateEmailLimiter.consume(ip);
  } catch {
    logSecurityEvent('RATE_LIMIT_HIT', { ip, route: '/api/validate-email' });
    return NextResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 });
  }
  try {
    const parsed = ValidateEmailSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Valid email address is required." },
        { status: 400 }
      );
    }
    const { email } = parsed.data;
    const isDisposableEmail = await disposableEmailDetector(email.trim());
    
    return NextResponse.json({ isDisposableEmail });
  } catch (err) {
    logger.error({ err }, 'POST /api/validate-email failed');
    return NextResponse.json(
      { message: "Error checking email. Please try again." },
      { status: 500 }
    );
  }
}
