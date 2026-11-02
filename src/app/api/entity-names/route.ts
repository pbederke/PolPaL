import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { createEntityName } from '@/modules/entity-names/entity-names.service';
import { EntityNameCreateSchema } from '@/modules/entity-names/entity-names.schema';
import logger from '@/lib/server/logger.server';

export async function POST(request: Request) {
  const auth = (await enforceRouteAuth('/api/entity-names', 'POST'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const parsed = EntityNameCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const result = await createEntityName(auth.userId, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'POST /api/entity-names failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
