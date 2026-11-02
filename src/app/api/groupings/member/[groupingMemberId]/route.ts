import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { deleteGroupingMember, updateGroupingMember } from '@/modules/groupings/groupings.service';
import { GroupingMemberUpdateSchema } from '@/modules/groupings/groupings.schema';
import logger from '@/lib/server/logger.server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ groupingMemberId: string }> }
) {
  const auth = (await enforceRouteAuth('/api/groupings/member/[groupingMemberId]', 'PATCH'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const { groupingMemberId } = await params;
    const id = Number(groupingMemberId);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid grouping member ID' }, { status: 400 });

    const parsed = GroupingMemberUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const body = parsed.data;
    const result = await updateGroupingMember(id, auth.userId, {
      startYear: body.startYear ?? null,
      startMonth: body.startMonth ?? null,
      startDay: body.startDay ?? null,
      endYear: body.endYear ?? null,
      endMonth: body.endMonth ?? null,
      endDay: body.endDay ?? null,
      ...(body.comment !== undefined ? { comment: body.comment ?? null } : {}),
    });
    return NextResponse.json(result);
  } catch (error: unknown) {
    logger.error({ err: error }, 'PATCH /api/groupings/member/[id] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ groupingMemberId: string }> }
) {
  const auth = (await enforceRouteAuth('/api/groupings/member/[groupingMemberId]', 'DELETE'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const { groupingMemberId } = await params;
    const id = Number(groupingMemberId);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid grouping member ID' }, { status: 400 });
    let comment: string | undefined;
    try { const b = await request.json(); if (typeof b?.comment === 'string') comment = b.comment.trim().slice(0, 1000) || undefined; } catch { /* no body */ }
    await deleteGroupingMember(id, auth.userId, comment);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'DELETE /api/groupings/member/[id] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
