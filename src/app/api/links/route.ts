import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { createLink } from '@/modules/links/links.service';
import { LinkCreateSchema } from '@/modules/links/links.schema';
import logger from '@/lib/server/logger.server';

export async function POST(request: Request) {
  const auth = (await enforceRouteAuth('/api/links', 'POST'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const parsed = LinkCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const { uniqueObservationId, polpalId, startYear, startMonth, startDay, endYear, endMonth, endDay, comment } = parsed.data;
    const newLink = await createLink({
      polpalId,
      uniqueObservationId,
      startYear,
      startMonth,
      startDay,
      endYear,
      endMonth,
      endDay,
      comment,
    }, auth.userId);
    return NextResponse.json(newLink, { status: 201 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'POST /api/links failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
