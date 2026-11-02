import { NextResponse, NextRequest } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getProjectsAdmin } from '@/modules/admin/admin.service';
import logger from '@/lib/server/logger.server';

export async function GET(request: NextRequest) {
  const auth = (await enforceRouteAuth('/api/admin/projects', 'GET'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10));
    const take = 1000;
    const skip = (page - 1) * take;
    const { items, total } = await getProjectsAdmin(skip, take);
    return NextResponse.json({ items, total, page, pageCount: Math.ceil(total / take) });
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/admin/projects failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
