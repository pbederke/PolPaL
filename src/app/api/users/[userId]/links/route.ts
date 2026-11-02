import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getLinksByUser, countLinksByUser } from '@/modules/users/users.service';
import logger from '@/lib/server/logger.server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = (await enforceRouteAuth('/api/users/[userId]/links', 'GET'))!;
  if (auth instanceof NextResponse) return auth;

  const { userId } = await params;
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 });
  if (auth.userId !== id) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const versionKey = searchParams.get('versionKey') ?? undefined;
  const limitParam = searchParams.get('limit');
  const limit = limitParam !== null ? Number(limitParam) : undefined;
  if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
    return NextResponse.json({ message: 'Invalid limit parameter' }, { status: 400 });
  }
  const clampedLimit = limit !== undefined ? Math.min(limit, 1000) : undefined;

  try {
    if (clampedLimit) {
      const [items, total] = await Promise.all([getLinksByUser(id, versionKey, clampedLimit), countLinksByUser(id)]);
      return NextResponse.json({ items, total });
    }
    return NextResponse.json(await getLinksByUser(id, versionKey));
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/users/[userId]/links failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
