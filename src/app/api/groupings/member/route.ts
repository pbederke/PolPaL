import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { createGroupingMember } from '@/modules/groupings/groupings.service';
import { GroupingMemberCreateSchema } from '@/modules/groupings/groupings.schema';
import logger from '@/lib/server/logger.server';

export async function POST(request: Request) {
  const auth = (await enforceRouteAuth('/api/groupings/member', 'POST'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const parsed = GroupingMemberCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const result = await createGroupingMember(auth.userId, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'POST /api/groupings/member failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
