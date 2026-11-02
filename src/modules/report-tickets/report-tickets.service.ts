import 'server-only';
import { prisma } from '@/lib/server/prisma.server';
import logger from '@/lib/server/logger.server';
import { ReportTicketStatus } from '@/lib/shared/enums';

const PRIVILEGED_ROLES = ['ADMIN', 'DATAMANAGER', 'EDITOR'] as const;

// ------------------------------------------------------------------------------
// GET own tickets
// ------------------------------------------------------------------------------

export async function getTicketsByUser(userId: number) {
  try {
    return await prisma.reportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        url: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
      },
    });
  } catch (error) {
    logger.error({ err: error, userId }, 'getTicketsByUser failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// GET all tickets (privileged roles)
// ------------------------------------------------------------------------------

export async function getAllTickets() {
  try {
    return await prisma.reportTicket.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        url: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        user: {
          select: { username: true },
        },
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'getAllTickets failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// CREATE
// ------------------------------------------------------------------------------

export async function createTicket(
  data: { title: string; description: string; url?: string | null },
  userId: number,
) {
  try {
    return await prisma.reportTicket.create({
      data: {
        title: data.title,
        description: data.description,
        url: data.url ?? null,
        userId,
      },
    });
  } catch (error) {
    logger.error({ err: error, userId }, 'createTicket failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// DELETE (ownership enforced here)
// ------------------------------------------------------------------------------

export async function deleteTicket(
  ticketId: number,
  requestingUserId: number,
  requestingRole: string,
) {
  try {
    const ticket = await prisma.reportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Not found');

    const isPrivileged = (PRIVILEGED_ROLES as readonly string[]).includes(requestingRole);
    if (!isPrivileged && ticket.userId !== requestingUserId) {
      throw new Error('Forbidden');
    }

    return await prisma.reportTicket.delete({ where: { id: ticketId } });
  } catch (error) {
    logger.error({ err: error, ticketId }, 'deleteTicket failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// UPDATE STATUS (privileged roles only — enforced at route level)
// ------------------------------------------------------------------------------

export async function updateTicketStatus(ticketId: number, status: ReportTicketStatus) {
  try {
    return await prisma.reportTicket.update({
      where: { id: ticketId },
      data: { status },
    });
  } catch (error) {
    logger.error({ err: error, ticketId }, 'updateTicketStatus failed');
    throw error;
  }
}
