import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';

export async function POST() {
  const _auth = await enforceRouteAuth('/api/authentication/logout', 'POST');
  if (_auth instanceof NextResponse) return _auth;
  const response = NextResponse.json({ message: 'Logged out successfully' });
  response.cookies.set('polpal_token', '', {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  return response;
}
