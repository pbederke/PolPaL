import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { cookies } from 'next/headers';
import { getAuthPayload } from '@/lib/server/auth.server';
import logger from '@/lib/server/logger.server';

export async function GET() {
  const _auth = await enforceRouteAuth('/api/authentication/status', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const payload = await getAuthPayload();
    if (!payload) {
      // Distinguish "never logged in" from "had a token but it's now invalid"
      const cookieStore = await cookies();
      const hadToken = !!cookieStore.get('polpal_token')?.value;
      return NextResponse.json(
        { loggedIn: false, reason: hadToken ? 'session_expired' : 'unauthenticated' },
        { status: 401 },
      );
    }
    return NextResponse.json({
      loggedIn: true,
      userId: payload.userId,
      username: payload.username,
      approvedByAdmin: payload.approvedByAdmin,
      role: payload.role,
    });
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/authentication/status failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
