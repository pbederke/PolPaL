import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { refreshVerificationEmail } from '@/modules/authentication/authentication.service';
import { passwordResetLimiter, getClientIp } from '@/lib/server/rate-limit.server';
import { ResendSchema } from '@/modules/authentication/authentication.schema';

/**
 * POST /api/authentication/resend-verification
 * Resends the verification email. Always returns 200 to prevent user enumeration.
 */
export async function POST(request: Request) {
  const _auth = await enforceRouteAuth('/api/authentication/resend-verification', 'POST');
  if (_auth instanceof NextResponse) return _auth;
  try {
    await passwordResetLimiter.consume(getClientIp(request));
  } catch {
    return NextResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  try {
    const parsed = ResendSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }

    await refreshVerificationEmail(parsed.data.email);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
