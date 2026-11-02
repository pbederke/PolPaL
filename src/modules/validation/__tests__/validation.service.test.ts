import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockLogger } from '@/__test-utils__/mocks';

vi.mock('@/lib/server/prisma.server', () => ({ prisma: mockPrisma() }));
vi.mock('@/lib/server/logger.server', () => ({ default: mockLogger() }));

import { prisma } from '@/lib/server/prisma.server';
import logger from '@/lib/server/logger.server';
import {
  upsertLinkValidation,
  getLinkVerificationSummary,
  deleteVerification,
  getRejectedValidations,
} from '../validation.service';

describe('validation.service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('upsertLinkValidation', () => {
    it('upserts a validation and returns summary', async () => {
      vi.mocked(prisma.linksEntryToEntity.findUnique).mockResolvedValue({
        linkEntriesToEntityId: 1, userId: 10,
      } as never);
      vi.mocked(prisma.validationLinks.upsert).mockResolvedValue({
        validationId: 1, linkId: 1, userId: 2, validated: 'APPROVED',
      } as never);
      vi.mocked(prisma.validationLinks.count)
        .mockResolvedValueOnce(3)  // approved
        .mockResolvedValueOnce(0); // rejected

      const result = await upsertLinkValidation({
        linkId: 1, userId: 2, validated: 'APPROVED' as never,
      });
      expect(result.verification).toBeDefined();
      expect(result.summary.approvedCount).toBe(3);
      expect(result.summary.rejectedCount).toBe(0);
    });

    it('throws when link not found', async () => {
      vi.mocked(prisma.linksEntryToEntity.findUnique).mockResolvedValue(null);
      await expect(upsertLinkValidation({
        linkId: 999, userId: 2, validated: 'APPROVED' as never,
      })).rejects.toThrow('Link not found');
    });

    it('throws when user tries to validate own link', async () => {
      vi.mocked(prisma.linksEntryToEntity.findUnique).mockResolvedValue({
        linkEntriesToEntityId: 1, userId: 2,
      } as never);
      await expect(upsertLinkValidation({
        linkId: 1, userId: 2, validated: 'APPROVED' as never,
      })).rejects.toThrow('Cannot validate own link');
    });
  });

  describe('getLinkVerificationSummary', () => {
    it('returns summary with votes', async () => {
      vi.mocked(prisma.linksEntryToEntity.findUnique).mockResolvedValue({ linkEntriesToEntityId: 1 } as never);
      vi.mocked(prisma.validationLinks.count)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1);
      vi.mocked(prisma.validationLinks.findMany).mockResolvedValue([] as never);

      const result = await getLinkVerificationSummary(1);
      expect(result.linkId).toBe(1);
      expect(result.approvedCount).toBe(2);
      expect(result.rejectedCount).toBe(1);
    });

    it('throws when link not found', async () => {
      vi.mocked(prisma.linksEntryToEntity.findUnique).mockResolvedValue(null);
      await expect(getLinkVerificationSummary(999)).rejects.toThrow('Link not found');
    });
  });

  describe('deleteVerification', () => {
    it('deletes and returns updated counts', async () => {
      vi.mocked(prisma.validationLinks.deleteMany).mockResolvedValue({ count: 1 } as never);
      vi.mocked(prisma.validationLinks.count)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0);

      const result = await deleteVerification(1, 2);
      expect(result.summary.linkId).toBe(1);
    });
  });

  describe('getRejectedValidations', () => {
    it('returns rejected entries', async () => {
      vi.mocked(prisma.entries.findMany).mockResolvedValue([] as never);
      const result = await getRejectedValidations();
      expect(result).toEqual([]);
    });
  });

  describe('catch-log-rethrow', () => {
    it('upsertLinkValidation rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.linksEntryToEntity.findUnique).mockResolvedValue({
        linkEntriesToEntityId: 1, userId: 10,
      } as never);
      vi.mocked(prisma.validationLinks.upsert).mockRejectedValue(dbError);

      await expect(upsertLinkValidation({
        linkId: 1, userId: 2, validated: 'APPROVED' as never,
      })).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getLinkVerificationSummary rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.linksEntryToEntity.findUnique).mockResolvedValue({ linkEntriesToEntityId: 1 } as never);
      vi.mocked(prisma.validationLinks.count).mockRejectedValue(dbError);

      await expect(getLinkVerificationSummary(1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteVerification rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.validationLinks.deleteMany).mockRejectedValue(dbError);

      await expect(deleteVerification(1, 2)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getRejectedValidations rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entries.findMany).mockRejectedValue(dbError);

      await expect(getRejectedValidations()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
