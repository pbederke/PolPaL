import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { createReference } from '@/modules/references/references.service';
import { ReferenceCreateSchema } from '@/modules/references/references.schema';
import logger from '@/lib/server/logger.server';

export async function POST(request: Request) {
  const auth = (await enforceRouteAuth('/api/references', 'POST'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const parsed = ReferenceCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const result = await createReference(parsed.data, auth.userId);
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'POST /api/references failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
