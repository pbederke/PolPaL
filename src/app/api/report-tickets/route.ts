import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getAllTickets, getTicketsByUser, createTicket } from '@/modules/report-tickets/report-tickets.service';
import { ReportTicketCreateSchema } from '@/modules/report-tickets/report-tickets.schema';
import logger from '@/lib/server/logger.server';

const PRIVILEGED_ROLES = ['ADMIN', 'DATAMANAGER', 'EDITOR'];

export async function GET() {
  const auth = (await enforceRouteAuth('/api/report-tickets', 'GET'))!;
  if (auth instanceof NextResponse) return auth;

  try {
    const isPrivileged = auth.role && PRIVILEGED_ROLES.includes(auth.role);
    const tickets = isPrivileged ? await getAllTickets() : await getTicketsByUser(auth.userId);
    return NextResponse.json(tickets);
  } catch (error) {
    logger.error({ err: error }, 'GET /api/report-tickets failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = (await enforceRouteAuth('/api/report-tickets', 'POST'))!;
  if (auth instanceof NextResponse) return auth;

  try {
    const parsed = ReportTicketCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const ticket = await createTicket(parsed.data, auth.userId);
    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, 'POST /api/report-tickets failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
