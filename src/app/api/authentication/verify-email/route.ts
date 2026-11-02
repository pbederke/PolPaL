import { NextRequest, NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { verifyUserEmail } from '@/modules/authentication/authentication.service';
import { sendAdminApprovalRequestEmail } from '@/lib/server/email.server';
import logger from '@/lib/server/logger.server';
import { loginLimiter, getClientIp } from '@/lib/server/rate-limit.server';
import { logSecurityEvent } from '@/lib/server/security-events.server';

/**
 * GET /api/authentication/verify-email?token=<raw-token>
 * Verifies the email address and redirects to the login page.
 */
export async function GET(request: NextRequest) {
  const _auth = await enforceRouteAuth('/api/authentication/verify-email', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const ip = getClientIp(request);
  try {
    await loginLimiter.consume(ip);
  } catch {
    logSecurityEvent('RATE_LIMIT_HIT', { ip, route: '/api/authentication/verify-email' });
    return NextResponse.redirect(new URL('/authentication/verify-email?error=rate_limited', baseUrl));
  }

  const rawToken = request.nextUrl.searchParams.get('token');
  if (!rawToken) {
    return NextResponse.redirect(new URL('/authentication/verify-email?error=missing_token', baseUrl));
  }

  try {
    const { username, email, adminEmails } = await verifyUserEmail(rawToken);

    if (adminEmails.length > 0) {
      // Fire-and-forget — don't block redirect on email delivery
      sendAdminApprovalRequestEmail(adminEmails, username, email).catch((err) =>
        logger.warn({ err }, 'Failed to notify admins of approval request'),
      );
    }

    return NextResponse.redirect(new URL('/authentication/login?verified=true', baseUrl));
  } catch (err: unknown) {
    const errCode = (err as { code?: string })?.code;
    if (errCode === 'INVALID_TOKEN') {
      return NextResponse.redirect(new URL('/authentication/verify-email?error=invalid_token', baseUrl));
    }
    if (errCode === 'EXPIRED_TOKEN') {
      return NextResponse.redirect(new URL('/authentication/verify-email?error=expired_token', baseUrl));
    }
    return NextResponse.redirect(new URL('/authentication/verify-email?error=server_error', baseUrl));
  }
}
