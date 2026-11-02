import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { updateApproveUserAdmin, deleteApproveUserAdmin, getUserForApprovalDeletion } from '@/modules/admin/admin.service';
import { ApproveUserUpdateSchema } from '@/modules/admin/admin.schema';
import { sendApprovalGrantedEmail, sendApprovalDeclinedEmail } from '@/lib/server/email.server';
import logger from '@/lib/server/logger.server';
import { DeclineNoteSchema } from '@/modules/admin/admin.schema';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ approveUserId: string }> }
) {
  const auth = (await enforceRouteAuth('/api/admin/approveUsers/[approveUserId]', 'PUT'))!;
  if (auth instanceof NextResponse) return auth;
  const { approveUserId } = await params;
  const id = Number(approveUserId);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 });
  try {
    const parsed = ApproveUserUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const { declineNote, ...updateData } = parsed.data;
    const updatedUser = await updateApproveUserAdmin(id, updateData);

    // Notify user of approval decision
    if (parsed.data.approvedByAdmin === true) {
      sendApprovalGrantedEmail(updatedUser.email, updatedUser.username).catch((err) =>
        logger.warn({ err }, 'Failed to send approval granted email'),
      );
    } else if (parsed.data.approvedByAdmin === false && declineNote) {
      sendApprovalDeclinedEmail(updatedUser.email, updatedUser.username, declineNote).catch((err) =>
        logger.warn({ err }, 'Failed to send approval declined email'),
      );
    }

    return NextResponse.json(updatedUser);
  } catch (error: unknown) {
    logger.error({ err: error }, 'PUT /api/admin/approveUsers/[id] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ approveUserId: string }> }
) {
  const auth = (await enforceRouteAuth('/api/admin/approveUsers/[approveUserId]', 'DELETE'))!;
  if (auth instanceof NextResponse) return auth;
  const { approveUserId } = await params;
  const id = Number(approveUserId);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 });
  let declineNote = 'No reason provided.';
  try {
    const body = await request.json();
    const parsed = DeclineNoteSchema.safeParse(body);
    if (parsed.success && parsed.data.declineNote?.trim()) {
      declineNote = parsed.data.declineNote.trim();
    }
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }
  try {
    // Fetch user before deletion so we can send the email
    const user = await getUserForApprovalDeletion(id);

    await deleteApproveUserAdmin(id);

    if (user) {
      sendApprovalDeclinedEmail(user.email, user.username, declineNote).catch((err) =>
        logger.warn({ err }, 'Failed to send approval declined email'),
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'DELETE /api/admin/approveUsers/[id] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
