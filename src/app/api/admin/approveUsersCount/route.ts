import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getApproveUserCountAdmin } from '@/modules/admin/admin.service';
import logger from '@/lib/server/logger.server';

export async function GET() {
  const auth = (await enforceRouteAuth('/api/admin/approveUsersCount', 'GET'))!;
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const data = await getApproveUserCountAdmin();
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/admin/approveUsersCount failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
