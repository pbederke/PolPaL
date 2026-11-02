import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntities, createEntity } from '@/modules/entities/entities.service';
import { EntityCreateSchema } from '@/modules/entities/entities.schema';
import logger from '@/lib/server/logger.server';

export async function GET() {
  const _auth = await enforceRouteAuth('/api/entities', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const data = await getEntities();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await enforceRouteAuth('/api/entities', 'POST');
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const parsed = EntityCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const entity = await createEntity(parsed.data, auth.userId);
    return NextResponse.json(entity, { status: 201 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'POST /api/entities failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
