import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { createEntityChange } from '@/modules/entity-changes/entity-changes.service';
import { EntityChangeCreateSchema } from '@/modules/entity-changes/entity-changes.schema';
import logger from '@/lib/server/logger.server';

export async function POST(request: Request) {
  const auth = (await enforceRouteAuth('/api/entity-changes', 'POST'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const parsed = EntityChangeCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const body = parsed.data;
    const changeData = {
      ...body,
      changeMonth: body.changeMonth ?? null,
      changeDay: body.changeDay ?? null,
      comment: body.comment ?? null,
    };
    const result = await createEntityChange(auth.userId, changeData);
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'POST /api/entity-changes failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
