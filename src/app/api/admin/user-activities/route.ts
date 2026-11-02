import { NextRequest, NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getUserActivityOverview } from '@/modules/admin/admin.service';
import logger from '@/lib/server/logger.server';
import { UserActivitiesQuerySchema } from '@/modules/admin/admin.schema';

export async function GET(request: NextRequest) {
  const auth = (await enforceRouteAuth('/api/admin/user-activities', 'GET'))!;
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const parsed = UserActivitiesQuerySchema.safeParse({
    from: request.nextUrl.searchParams.get('from') ?? undefined,
    to: request.nextUrl.searchParams.get('to') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid query parameters' }, { status: 400 });
  }

  const { from, to } = parsed.data;
  const fromDate = from ? new Date(`${from}T00:00:00.000Z`) : undefined;
  const toDate = to ? new Date(`${to}T23:59:59.999Z`) : undefined;

  if (fromDate && toDate && fromDate > toDate) {
    return NextResponse.json({ message: '`from` must be before `to`' }, { status: 400 });
  }

  try {
    const data = await getUserActivityOverview(fromDate, toDate);
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/admin/user-activities failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
