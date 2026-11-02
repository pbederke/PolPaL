import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';

export async function GET() {
  const _auth = await enforceRouteAuth('/api/health', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  return NextResponse.json({ status: 'ok' });
}
