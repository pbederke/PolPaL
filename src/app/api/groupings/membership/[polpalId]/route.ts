import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getGroupingMembershipByPolpalId } from '@/modules/groupings/groupings.service';
import logger from '@/lib/server/logger.server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ polpalId: string }> }
) {
  const _auth = await enforceRouteAuth('/api/groupings/membership/[polpalId]', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const { polpalId } = await params;
    const id = Number(polpalId);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid PolPaL ID' }, { status: 400 });
    const data = await getGroupingMembershipByPolpalId(id);
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/groupings/membership/[polpalId] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
