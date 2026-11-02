import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getReferencesAdmin } from '@/modules/admin/admin.service';
import logger from '@/lib/server/logger.server';

export async function GET() {
  const auth = (await enforceRouteAuth('/api/admin/references', 'GET'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const data = await getReferencesAdmin();
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/admin/references failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
