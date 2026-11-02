import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockLogger } from '@/__test-utils__/mocks';

vi.mock('@/lib/server/prisma.server', () => ({ prisma: mockPrisma() }));
vi.mock('@/lib/server/logger.server', () => ({ default: mockLogger() }));
vi.mock('@/lib/server/changelogLogger', () => ({ logChangelog: vi.fn() }));

import { prisma } from '@/lib/server/prisma.server';
import logger from '@/lib/server/logger.server';
import { logChangelog } from '@/lib/server/changelogLogger';
import {
  getEntityReferences,
  deleteReference,
  createReference,
  updateReference,
} from '../references.service';

describe('references.service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getEntityReferences', () => {
    it('returns references for a polpalId', async () => {
      const mockData = [{ referenceId: 1, referencedField: 'nameShort', type: 'SOURCE', value: 'https://example.com', language: null, accessedAt: null, comment: null, createdAt: new Date() }];
      vi.mocked(prisma.references.findMany).mockResolvedValue(mockData as never);
      const result = await getEntityReferences(100);
      expect(result).toEqual(mockData);
    });
  });

  describe('deleteReference', () => {
    it('deletes and logs changelog', async () => {
      const existing = { referenceId: 1, polpalId: 100, value: 'ref', type: 'SOURCE' };
      vi.mocked(prisma.references.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.references.delete).mockResolvedValue(existing as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      await deleteReference(1, 1, 'obsolete');
      expect(prisma.references.delete).toHaveBeenCalled();
      expect(logChangelog).toHaveBeenCalledOnce();
    });

    it('throws when not found', async () => {
      vi.mocked(prisma.references.findUnique).mockResolvedValue(null);
      await expect(deleteReference(999, 1)).rejects.toThrow('Reference not found');
    });
  });

  describe('createReference', () => {
    it('creates a reference and logs changelog', async () => {
      const created = { referenceId: 1, polpalId: 100, value: 'https://example.com', type: 'SOURCE', userId: 1 };
      vi.mocked(prisma.references.create).mockResolvedValue(created as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      const result = await createReference(
        { polpalId: 100, type: 'SOURCE' as never, value: 'https://example.com' },
        1,
      );
      expect(result).toEqual(created);
      expect(logChangelog).toHaveBeenCalledOnce();
    });
  });

  describe('updateReference', () => {
    const existing = {
      referenceId: 1,
      polpalId: 100,
      value: 'old value',
      type: 'SOURCE',
      referencedField: null,
      language: null,
      accessedAt: null,
      comment: null,
    };

    it('updates a reference and logs changelog for changed fields', async () => {
      const updated = { ...existing, value: 'new value', comment: 'updated' };
      vi.mocked(prisma.references.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.references.update).mockResolvedValue(updated as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      const result = await updateReference(1, { value: 'new value', comment: 'updated' }, 1);
      expect(result).toEqual(updated);
      expect(prisma.references.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { referenceId: 1 } }),
      );
      expect(logChangelog).toHaveBeenCalledTimes(2);
    });

    it('throws when not found', async () => {
      vi.mocked(prisma.references.findUnique).mockResolvedValue(null);
      await expect(updateReference(999, { value: 'x' }, 1)).rejects.toThrow('Reference not found');
      expect(prisma.references.update).not.toHaveBeenCalled();
    });

    it('does not log changelog when nothing changed', async () => {
      vi.mocked(prisma.references.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.references.update).mockResolvedValue(existing as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      await updateReference(1, { value: 'old value' }, 1);
      expect(logChangelog).not.toHaveBeenCalled();
    });
  });

  describe('catch-log-rethrow', () => {
    it('getEntityReferences rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.references.findMany).mockRejectedValue(dbError);

      await expect(getEntityReferences(100)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('updateReference rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.references.findUnique).mockResolvedValue({
        referenceId: 1, polpalId: 100, value: 'old value', type: 'SOURCE',
        referencedField: null, language: null, accessedAt: null, comment: null,
      } as never);
      vi.mocked(prisma.references.update).mockRejectedValue(dbError);

      await expect(updateReference(1, { value: 'new value' }, 1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteReference rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.references.findUnique).mockResolvedValue({
        referenceId: 1, polpalId: 100, value: 'ref', type: 'SOURCE',
      } as never);
      vi.mocked(prisma.references.delete).mockRejectedValue(dbError);

      await expect(deleteReference(1, 1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('createReference rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.references.create).mockRejectedValue(dbError);

      await expect(createReference(
        { polpalId: 100, type: 'SOURCE' as never, value: 'https://example.com' },
        1,
      )).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
