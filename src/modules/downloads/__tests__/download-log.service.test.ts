import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockLogger } from '@/__test-utils__/mocks';

vi.mock('@/lib/server/prisma.server', () => ({ prisma: mockPrisma() }));
vi.mock('@/lib/server/logger.server', () => ({ default: mockLogger() }));

import { prisma } from '@/lib/server/prisma.server';
import { logDownload, getDownloadAnalytics } from '../download-log.service';

describe('download-log.service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('logDownload', () => {
    it('creates a download log entry (fire-and-forget)', async () => {
      vi.mocked(prisma.downloadLog.create).mockResolvedValue({} as never);

      logDownload({
        downloadType: 'ENTRIES',
        versionKey: 'v1',
        filters: {},
      });

      expect(prisma.downloadLog.create).toHaveBeenCalledWith({
        data: {
          downloadType: 'ENTRIES',
          versionKey: 'v1',
          filters: {},
        },
      });
    });

    it('does not throw when logging fails', async () => {
      vi.mocked(prisma.downloadLog.create).mockRejectedValue(new Error('DB error'));
      expect(() => logDownload({ downloadType: 'ENTRIES', filters: {} })).not.toThrow();
    });
  });

  describe('getDownloadAnalytics', () => {
    it('returns aggregated analytics', async () => {
      vi.mocked(prisma.downloadLog.groupBy)
        .mockResolvedValueOnce([{ downloadType: 'ENTRIES', _count: { id: 50 } }])
        .mockResolvedValueOnce([{ versionKey: 'v1', _count: { id: 30 } }])
        .mockResolvedValueOnce([]);
      vi.mocked(prisma.$queryRaw)
        .mockResolvedValueOnce([])  // daily
        .mockResolvedValueOnce([])  // monthly
        .mockResolvedValueOnce([])  // entryVersionStats
        .mockResolvedValueOnce([])  // topDatasets
        .mockResolvedValueOnce([]); // topProjects

      const result = await getDownloadAnalytics();
      expect(result.byType).toHaveLength(1);
      expect(result.byType[0].downloadType).toBe('ENTRIES');
      expect(result.byType[0].count).toBe(50);
      expect(result.topEntries).toHaveLength(1);
    });
  });
});
