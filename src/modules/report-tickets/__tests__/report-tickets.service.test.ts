import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockLogger } from '@/__test-utils__/mocks';

vi.mock('@/lib/server/prisma.server', () => ({ prisma: mockPrisma() }));
vi.mock('@/lib/server/logger.server', () => ({ default: mockLogger() }));

import { prisma } from '@/lib/server/prisma.server';
import logger from '@/lib/server/logger.server';
import {
  getTicketsByUser,
  getAllTickets,
  createTicket,
  deleteTicket,
  updateTicketStatus,
} from '../report-tickets.service';

describe('report-tickets.service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getTicketsByUser', () => {
    it('returns tickets for the given user', async () => {
      const mockData = [
        { id: 1, title: 'Bug', description: 'desc', url: null, status: 'OPEN', createdAt: new Date(), updatedAt: new Date(), userId: 2 },
      ];
      vi.mocked(prisma.reportTicket.findMany).mockResolvedValue(mockData as never);

      const result = await getTicketsByUser(2);
      expect(result).toEqual(mockData);
      expect(prisma.reportTicket.findMany).toHaveBeenCalledWith({
        where: { userId: 2 },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, title: true, description: true, url: true,
          status: true, createdAt: true, updatedAt: true, userId: true,
        },
      });
    });
  });

  describe('getAllTickets', () => {
    it('returns all tickets with username', async () => {
      const mockData = [
        { id: 1, title: 'Bug', description: 'desc', url: null, status: 'OPEN', createdAt: new Date(), updatedAt: new Date(), userId: 2, user: { username: 'bob' } },
      ];
      vi.mocked(prisma.reportTicket.findMany).mockResolvedValue(mockData as never);

      const result = await getAllTickets();
      expect(result).toEqual(mockData);
    });
  });

  describe('createTicket', () => {
    it('creates a ticket with userId', async () => {
      const created = { id: 1, title: 'Bug', description: 'desc', url: null, status: 'OPEN', createdAt: new Date(), updatedAt: new Date(), userId: 2 };
      vi.mocked(prisma.reportTicket.create).mockResolvedValue(created as never);

      const result = await createTicket({ title: 'Bug', description: 'desc' }, 2);
      expect(result).toEqual(created);
      expect(prisma.reportTicket.create).toHaveBeenCalledWith({
        data: { title: 'Bug', description: 'desc', url: null, userId: 2 },
      });
    });
  });

  describe('deleteTicket', () => {
    it('deletes when user owns the ticket', async () => {
      const ticket = { id: 1, userId: 2, title: 'x', description: 'x', url: null, status: 'OPEN', createdAt: new Date(), updatedAt: new Date() };
      vi.mocked(prisma.reportTicket.findUnique).mockResolvedValue(ticket as never);
      vi.mocked(prisma.reportTicket.delete).mockResolvedValue(ticket as never);

      await deleteTicket(1, 2, 'USER');
      expect(prisma.reportTicket.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('deletes when user is privileged', async () => {
      const ticket = { id: 1, userId: 99, title: 'x', description: 'x', url: null, status: 'OPEN', createdAt: new Date(), updatedAt: new Date() };
      vi.mocked(prisma.reportTicket.findUnique).mockResolvedValue(ticket as never);
      vi.mocked(prisma.reportTicket.delete).mockResolvedValue(ticket as never);

      await deleteTicket(1, 2, 'ADMIN');
      expect(prisma.reportTicket.delete).toHaveBeenCalled();
    });

    it('throws when ticket not found', async () => {
      vi.mocked(prisma.reportTicket.findUnique).mockResolvedValue(null);
      await expect(deleteTicket(999, 2, 'USER')).rejects.toThrow('Not found');
    });

    it('throws when non-privileged user tries to delete others ticket', async () => {
      const ticket = { id: 1, userId: 99, title: 'x', description: 'x', url: null, status: 'OPEN', createdAt: new Date(), updatedAt: new Date() };
      vi.mocked(prisma.reportTicket.findUnique).mockResolvedValue(ticket as never);
      await expect(deleteTicket(1, 2, 'USER')).rejects.toThrow('Forbidden');
    });
  });

  describe('updateTicketStatus', () => {
    it('updates ticket status', async () => {
      const updated = { id: 1, title: 'x', description: 'x', url: null, status: 'RESOLVED', createdAt: new Date(), updatedAt: new Date(), userId: 2 };
      vi.mocked(prisma.reportTicket.update).mockResolvedValue(updated as never);

      const result = await updateTicketStatus(1, 'RESOLVED' as never);
      expect(result).toEqual(updated);
    });
  });

  describe('catch-log-rethrow', () => {
    it('getTicketsByUser rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.reportTicket.findMany).mockRejectedValue(dbError);

      await expect(getTicketsByUser(2)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getAllTickets rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.reportTicket.findMany).mockRejectedValue(dbError);

      await expect(getAllTickets()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('createTicket rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.reportTicket.create).mockRejectedValue(dbError);

      await expect(createTicket({ title: 'Bug', description: 'desc' }, 2))
        .rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteTicket rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.reportTicket.findUnique).mockResolvedValue({
        id: 1, userId: 2, title: 'x', description: 'x', url: null, status: 'OPEN', createdAt: new Date(), updatedAt: new Date(),
      } as never);
      vi.mocked(prisma.reportTicket.delete).mockRejectedValue(dbError);

      await expect(deleteTicket(1, 2, 'USER')).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('updateTicketStatus rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.reportTicket.update).mockRejectedValue(dbError);

      await expect(updateTicketStatus(1, 'RESOLVED' as never)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
