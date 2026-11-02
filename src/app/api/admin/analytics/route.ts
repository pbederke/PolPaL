import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getDownloadAnalytics } from '@/modules/downloads/download-log.service';
import logger from '@/lib/server/logger.server';

export async function GET() {
  const auth = (await enforceRouteAuth('/api/admin/analytics', 'GET'))!;
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const data = await getDownloadAnalytics();
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/admin/analytics failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
