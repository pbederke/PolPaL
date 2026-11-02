import { NextResponse } from 'next/server';
import { getCommentedEntities } from '@/modules/entities/entities.service';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import logger from '@/lib/server/logger.server';

export async function GET() {
  const auth = await enforceRouteAuth('/api/entities/commented-entities', 'GET');
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const data = await getCommentedEntities();
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/entities/commented-entities failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
