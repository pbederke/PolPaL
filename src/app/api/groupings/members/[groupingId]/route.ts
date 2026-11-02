import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getGroupingMembersByGroupingId } from '@/modules/groupings/groupings.service';
import logger from '@/lib/server/logger.server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ groupingId: string }> }
) {
  const _auth = await enforceRouteAuth('/api/groupings/members/[groupingId]', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const { groupingId } = await params;
    const id = Number(groupingId);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid grouping ID' }, { status: 400 });
    const data = await getGroupingMembersByGroupingId(id);
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/groupings/members/[groupingId] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
