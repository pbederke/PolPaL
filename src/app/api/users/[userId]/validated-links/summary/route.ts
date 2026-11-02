import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getValidatedLinksSummaryByUser } from '@/modules/users/users.service';
import logger from '@/lib/server/logger.server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = (await enforceRouteAuth('/api/users/[userId]/validated-links/summary', 'GET'))!;
  if (auth instanceof NextResponse) return auth;

  const { userId } = await params;
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 });
  if (auth.userId !== id) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

  try {
    const summary = await getValidatedLinksSummaryByUser(id);
    return NextResponse.json(summary);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/users/[userId]/validated-links/summary failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
