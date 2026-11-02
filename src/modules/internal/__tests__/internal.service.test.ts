import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockPrisma, mockLogger } from '@/__test-utils__/mocks';

vi.mock('@/lib/server/prisma.server', () => ({ prisma: mockPrisma() }));
vi.mock('@/lib/server/logger.server', () => ({ default: mockLogger() }));

import { prisma } from '@/lib/server/prisma.server';
import { getStats, getEntitiesByYear, getEntitiesByYearByCountry } from '../internal.service';

describe('internal.service', () => {
  let fakeNow = 1_000_000_000_000;
  beforeEach(() => {
    vi.clearAllMocks();
    fakeNow += 200_000;
    vi.useFakeTimers({ now: fakeNow });
  });
  afterEach(() => vi.useRealTimers());

  describe('getStats', () => {
    it('returns correctly typed stats for logged-in users (bigint → number)', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{
        countriesCount: BigInt(10 as never),
        allCount: BigInt(50),
        projectsCount: BigInt(5),
        datasetsCount: BigInt(8),
        versionsCount: BigInt(12),
        entriesCount: BigInt(1000),
        linksCount: BigInt(3000),
        totalProjectsCount: BigInt(7),
        totalDatasetsCount: BigInt(11),
        totalVersionsCount: BigInt(18),
        totalEntriesCount: BigInt(1500),
      }]);

      const result = await getStats(true);

      expect(result).toEqual({
        countriesCount: 10,
        allCount: 50,
        projectsCount: 5,
        datasetsCount: 8,
        versionsCount: 12,
        entriesCount: 1000,
        linksCount: 3000,
        totalProjectsCount: 7,
        totalDatasetsCount: 11,
        totalVersionsCount: 18,
        totalEntriesCount: 1500,
      });
      expect(prisma.$queryRaw).toHaveBeenCalledOnce();
      for (const val of Object.values(result)) {
        expect(typeof val).toBe('number');
      }
    });

    it('returns cached stats on second call within TTL', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{
        countriesCount: BigInt(10 as never),
        allCount: BigInt(50),
        projectsCount: BigInt(5),
        datasetsCount: BigInt(8),
        versionsCount: BigInt(12),
        entriesCount: BigInt(1000),
        linksCount: BigInt(3000),
        totalProjectsCount: BigInt(7),
        totalDatasetsCount: BigInt(11),
        totalVersionsCount: BigInt(18),
        totalEntriesCount: BigInt(1500),
      }]);

      await getStats(true);
      await getStats(true);

      expect(prisma.$queryRaw).toHaveBeenCalledOnce();
    });

    it('refreshes cache after TTL expires', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{
        countriesCount: BigInt(10 as never),
        allCount: BigInt(50),
        projectsCount: BigInt(5),
        datasetsCount: BigInt(8),
        versionsCount: BigInt(12),
        entriesCount: BigInt(1000),
        linksCount: BigInt(3000),
        totalProjectsCount: BigInt(7),
        totalDatasetsCount: BigInt(11),
        totalVersionsCount: BigInt(18),
        totalEntriesCount: BigInt(1500),
      }]);

      await getStats(true);
      vi.advanceTimersByTime(121_000);
      await getStats(true);

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it('returns correctly typed stats for non-logged-in users', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{
        countriesCount: BigInt(9999999 as never),
        allCount: BigInt(0),
        projectsCount: BigInt(1),
        datasetsCount: BigInt(42),
        versionsCount: BigInt(7),
        entriesCount: BigInt(123456),
        linksCount: BigInt(0),
        totalProjectsCount: BigInt(2),
        totalDatasetsCount: BigInt(50),
        totalVersionsCount: BigInt(10),
        totalEntriesCount: BigInt(200000),
      }]);

      const result = await getStats(false);

      expect(result.countriesCount).toBe(9999999);
      expect(result.allCount).toBe(0);
      expect(result.entriesCount).toBe(123456);
      expect(result.totalProjectsCount).toBe(2);
      expect(result.totalDatasetsCount).toBe(50);
      expect(result.totalVersionsCount).toBe(10);
      expect(result.totalEntriesCount).toBe(200000);
      for (const val of Object.values(result)) {
        expect(typeof val).toBe('number');
      }
    });
  });

  describe('getEntitiesByYear', () => {
    it('returns entity-by-year data with bigint → number conversion', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([
        { entryYear: 2020, entityCount: BigInt(30 as never) },
        { entryYear: 2021, entityCount: BigInt(45) },
      ]);

      const result = await getEntitiesByYear(true);

      expect(result).toEqual([
        { year: 2020, entityCount: 30 },
        { year: 2021, entityCount: 45 },
      ]);
      expect(prisma.$queryRaw).toHaveBeenCalledOnce();
      for (const item of result) {
        expect(typeof item.entityCount).toBe('number');
        expect(typeof item.year).toBe('number');
      }
    });

    it('returns empty array when no data', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([] as never);

      const result = await getEntitiesByYear(false);

      expect(result).toEqual([]);
    });

    it('returns cached data on second call within TTL', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([
        { entryYear: 2020, entityCount: BigInt(30 as never) },
      ]);

      await getEntitiesByYear(true);
      await getEntitiesByYear(true);

      expect(prisma.$queryRaw).toHaveBeenCalledOnce();
    });

    it('uses separate caches for logged-in vs public', async () => {
      vi.mocked(prisma.$queryRaw)
        .mockResolvedValueOnce([{ entryYear: 2020, entityCount: BigInt(10 as never) }])
        .mockResolvedValueOnce([{ entryYear: 2021, entityCount: BigInt(20 as never) }]);

      const authResult = await getEntitiesByYear(true);
      const publicResult = await getEntitiesByYear(false);

      expect(authResult).toEqual([{ year: 2020, entityCount: 10 }]);
      expect(publicResult).toEqual([{ year: 2021, entityCount: 20 }]);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });
  });

  describe('getEntitiesByYearByCountry', () => {
    it('returns entity-by-year data for a country with bigint → number conversion', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([
        { entryYear: 1990, entityCount: BigInt(5 as never) },
        { entryYear: 1991, entityCount: BigInt(8) },
      ]);

      const result = await getEntitiesByYearByCountry('DEU', true);

      expect(result).toEqual([
        { year: 1990, entityCount: 5 },
        { year: 1991, entityCount: 8 },
      ]);
      expect(prisma.$queryRaw).toHaveBeenCalledOnce();
      for (const item of result) {
        expect(typeof item.entityCount).toBe('number');
        expect(typeof item.year).toBe('number');
      }
    });

    it('returns empty array when no data', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([] as never);

      const result = await getEntitiesByYearByCountry('ATA', false);

      expect(result).toEqual([]);
    });

    it('returns cached data on second call within TTL', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([
        { entryYear: 2000, entityCount: BigInt(3 as never) },
      ]);

      await getEntitiesByYearByCountry('FRA', true);
      await getEntitiesByYearByCountry('FRA', true);

      expect(prisma.$queryRaw).toHaveBeenCalledOnce();
    });

    it('uses separate caches per country', async () => {
      vi.mocked(prisma.$queryRaw)
        .mockResolvedValueOnce([{ entryYear: 2000, entityCount: BigInt(1 as never) }])
        .mockResolvedValueOnce([{ entryYear: 2001, entityCount: BigInt(2 as never) }]);

      const first = await getEntitiesByYearByCountry('GBR', false);
      const second = await getEntitiesByYearByCountry('USA', false);

      expect(first).toEqual([{ year: 2000, entityCount: 1 }]);
      expect(second).toEqual([{ year: 2001, entityCount: 2 }]);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });
  });
});
