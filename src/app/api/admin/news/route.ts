import { NextRequest, NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getNewsAdmin } from '@/modules/admin/admin.service';
import logger from '@/lib/server/logger.server';

export async function GET(request: NextRequest) {
  const auth = (await enforceRouteAuth('/api/admin/news', 'GET'))!;
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10));
    const take = 1000;
    const skip = (page - 1) * take;
    const { items, total } = await getNewsAdmin(skip, take);
    const pageCount = Math.ceil(total / take);
    return NextResponse.json({ items, total, page, pageCount });
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/admin/news failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
