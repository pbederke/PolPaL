import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockLogger } from '@/__test-utils__/mocks';

vi.mock('@/lib/server/prisma.server', () => ({ prisma: mockPrisma() }));
vi.mock('@/lib/server/logger.server', () => ({ default: mockLogger() }));
vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

import { prisma } from '@/lib/server/prisma.server';
import logger from '@/lib/server/logger.server';
import bcrypt from 'bcrypt';
import {
  getUserById,
  updatePassword,
  countEntitiesByUser,
  getEntitiesByUser,
  getLinksSummaryByUser,
  countLinksByUser,
  getLinksByUser,
  getValidatedLinksSummaryByUser,
  countValidatedLinksByUser,
  getValidatedLinksByUser,
} from '../users.service';

describe('users.service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getUserById', () => {
    it('returns user by userId with selected fields', async () => {
      const mockUser = {
        userId: 1, nameFirst: 'Alice', nameLast: 'Smith', email: 'alice@test.com',
        username: 'alice', role: 'ADMIN', approvedByAdmin: true, createdAt: new Date(), updatedAt: new Date(),
      };
      vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);

      const result = await getUserById(1);

      expect(result).toEqual(mockUser);
      expect(prisma.users.findUnique).toHaveBeenCalledWith({
        where: { userId: 1 },
        select: {
          userId: true, nameFirst: true, nameLast: true, email: true,
          username: true, role: true, approvedByAdmin: true, createdAt: true, updatedAt: true,
        },
      });
    });

    it('returns null when user not found', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue(null);
      const result = await getUserById(999);
      expect(result).toBeNull();
    });
  });

  describe('updatePassword', () => {
    it('updates password when old password is correct', async () => {
      const user = { userId: 1, password: 'hashed-old' };
      vi.mocked(prisma.users.findUnique).mockResolvedValue(user as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-new' as never);
      vi.mocked(prisma.users.update).mockResolvedValue({} as never);

      const result = await updatePassword(1, 'oldPass1', 'NewPass1');

      expect(result).toEqual({ success: true });
      expect(bcrypt.compare).toHaveBeenCalledWith('oldPass1', 'hashed-old');
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass1', 12);
      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { userId: 1 },
        data: { password: 'hashed-new', tokenVersion: { increment: 1 } },
      });
    });

    it('throws when user not found', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue(null);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(updatePassword(999, 'old', 'new')).rejects.toThrow('Invalid credentials');
    });

    it('throws when old password is incorrect', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue({ userId: 1, password: 'hashed' } as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(updatePassword(1, 'wrong', 'new')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('countEntitiesByUser', () => {
    it('returns entity count for user', async () => {
      vi.mocked(prisma.entities.count).mockResolvedValue(5 as never);
      const result = await countEntitiesByUser(1);
      expect(result).toBe(5);
      expect(prisma.entities.count).toHaveBeenCalledWith({ where: { userId: 1 } });
    });
  });

  describe('countLinksByUser', () => {
    it('returns link count for user', async () => {
      vi.mocked(prisma.linksEntryToEntity.count).mockResolvedValue(12 as never);
      const result = await countLinksByUser(1);
      expect(result).toBe(12);
    });
  });

  describe('pagination caps', () => {
    it('getEntitiesByUser uses limit when provided', async () => {
      vi.mocked(prisma.entities.findMany).mockResolvedValue([] as never);
      await getEntitiesByUser(1, 5);
      expect(prisma.entities.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
    });

    it('getEntitiesByUser caps take at 1000 when no limit provided', async () => {
      vi.mocked(prisma.entities.findMany).mockResolvedValue([] as never);
      await getEntitiesByUser(1);
      expect(prisma.entities.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 1000 }));
    });

    it('getEntitiesByUser caps take at 1000 when limit exceeds 1000', async () => {
      vi.mocked(prisma.entities.findMany).mockResolvedValue([] as never);
      await getEntitiesByUser(1, 5000);
      expect(prisma.entities.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 1000 }));
    });

    it('getLinksByUser uses limit when provided', async () => {
      vi.mocked(prisma.linksEntryToEntity.findMany).mockResolvedValue([] as never);
      await getLinksByUser(1, undefined, 5);
      expect(prisma.linksEntryToEntity.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
    });

    it('getLinksByUser caps take at 1000 when no limit provided', async () => {
      vi.mocked(prisma.linksEntryToEntity.findMany).mockResolvedValue([] as never);
      await getLinksByUser(1);
      expect(prisma.linksEntryToEntity.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 1000 }));
    });

    it('getValidatedLinksByUser caps take at 1000 when no limit provided', async () => {
      vi.mocked(prisma.validationLinks.findMany).mockResolvedValue([] as never);
      await getValidatedLinksByUser(1);
      expect(prisma.validationLinks.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 1000 }));
    });
  });

  describe('catch-log-rethrow', () => {
    it('getUserById rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.users.findUnique).mockRejectedValue(dbError);

      await expect(getUserById(1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('countEntitiesByUser rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entities.count).mockRejectedValue(dbError);

      await expect(countEntitiesByUser(1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getEntitiesByUser rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entities.findMany).mockRejectedValue(dbError);

      await expect(getEntitiesByUser(1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getLinksSummaryByUser rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.linksEntryToEntity.findMany).mockRejectedValue(dbError);

      await expect(getLinksSummaryByUser(1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('countLinksByUser rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.linksEntryToEntity.count).mockRejectedValue(dbError);

      await expect(countLinksByUser(1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getLinksByUser rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.linksEntryToEntity.findMany).mockRejectedValue(dbError);

      await expect(getLinksByUser(1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getValidatedLinksSummaryByUser rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.validationLinks.findMany).mockRejectedValue(dbError);

      await expect(getValidatedLinksSummaryByUser(1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('countValidatedLinksByUser rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.validationLinks.count).mockRejectedValue(dbError);

      await expect(countValidatedLinksByUser(1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getValidatedLinksByUser rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.validationLinks.findMany).mockRejectedValue(dbError);

      await expect(getValidatedLinksByUser(1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('updatePassword rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.users.findUnique).mockResolvedValue({ userId: 1, password: 'hashed' } as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-new' as never);
      vi.mocked(prisma.users.update).mockRejectedValue(dbError);

      await expect(updatePassword(1, 'old', 'new')).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
