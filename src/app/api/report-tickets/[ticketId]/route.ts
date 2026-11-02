import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { deleteTicket, updateTicketStatus } from '@/modules/report-tickets/report-tickets.service';
import { ReportTicketStatusUpdateSchema } from '@/modules/report-tickets/report-tickets.schema';
import logger from '@/lib/server/logger.server';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  const auth = (await enforceRouteAuth('/api/report-tickets/[ticketId]', 'DELETE'))!;
  if (auth instanceof NextResponse) return auth;

  try {
    const { ticketId } = await params;
    const id = Number(ticketId);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid ticket ID' }, { status: 400 });

    await deleteTicket(id, auth.userId, auth.role ?? '');
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Forbidden') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      if (error.message === 'Not found') return NextResponse.json({ message: 'Ticket not found' }, { status: 404 });
    }
    logger.error({ err: error }, 'DELETE /api/report-tickets/[ticketId] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  const auth = (await enforceRouteAuth('/api/report-tickets/[ticketId]', 'PATCH'))!;
  if (auth instanceof NextResponse) return auth;

  try {
    const { ticketId } = await params;
    const id = Number(ticketId);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid ticket ID' }, { status: 400 });

    const parsed = ReportTicketStatusUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }

    const ticket = await updateTicketStatus(id, parsed.data.status);
    return NextResponse.json(ticket);
  } catch (error) {
    logger.error({ err: error }, 'PATCH /api/report-tickets/[ticketId] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
