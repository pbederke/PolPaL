import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockLogger } from '@/__test-utils__/mocks';

vi.mock('@/lib/server/prisma.server', () => ({ prisma: mockPrisma() }));
vi.mock('@/lib/server/logger.server', () => ({ default: mockLogger() }));
vi.mock('@/lib/server/changelogLogger', () => ({ logChangelog: vi.fn() }));

import { prisma } from '@/lib/server/prisma.server';
import logger from '@/lib/server/logger.server';
import { logChangelog } from '@/lib/server/changelogLogger';
import {
  getEntitiesInCountries,
  getEntitiesInCountriesByPolpalId,
  createEntitiesInCountries,
  deleteEntitiesInCountries,
  getEntityInfoByPolpalId,
  getEntityInfosByCountrycode,
  getGroupingsByPolpalId,
  getEntitiesByPolpalId,
  getGroupingsInCountries,
  getEntitiesForLinking,
} from '../entities-in-countries.service';

describe('entities-in-countries.service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getEntitiesInCountries', () => {
    it('returns all entities in countries with selects', async () => {
      const mockData = [{ Entities: { polpalId: 1, nameShort: 'SPD' }, Countries: { countryname: 'Germany' } }];
      vi.mocked(prisma.entitiesInCountries.findMany).mockResolvedValue(mockData as never);
      const result = await getEntitiesInCountries();
      expect(result).toEqual(mockData);
    });
  });

  describe('getEntitiesInCountriesByPolpalId', () => {
    it('returns entities for a given polpalId', async () => {
      vi.mocked(prisma.entitiesInCountries.findMany).mockResolvedValue([] as never);
      const result = await getEntitiesInCountriesByPolpalId(100);
      expect(prisma.entitiesInCountries.findMany).toHaveBeenCalledWith({
        where: { polpalId: 100 },
        select: {
          entityInCountryId: true,
          polpalId: true,
          countrycodePolpal: true,
          comment: true,
          Countries: { select: { countrycodePolpal: true, countryname: true, iso2c: true, region: true } },
        },
      });
      expect(result).toEqual([]);
    });
  });

  describe('createEntitiesInCountries', () => {
    it('creates entry after validating entity and country', async () => {
      const entity = { polpalId: 100, nameShort: 'SPD' };
      const country = { countrycodePolpal: 'DE', countryname: 'Germany' };
      const created = { entityInCountryId: 1, polpalId: 100, countrycodePolpal: 'DE', comment: null, userId: 1 };

      vi.mocked(prisma.entities.findUnique).mockResolvedValue(entity as never);
      vi.mocked(prisma.countries.findUnique).mockResolvedValue(country as never);
      vi.mocked(prisma.entitiesInCountries.create).mockResolvedValue(created as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      const result = await createEntitiesInCountries(1, { polpalId: 100, countrycodePolpal: 'DE' });
      expect(result).toEqual(created);
      expect(logChangelog).toHaveBeenCalledOnce();
    });

    it('throws when entity not found', async () => {
      vi.mocked(prisma.entities.findUnique).mockResolvedValue(null);
      await expect(createEntitiesInCountries(1, { polpalId: 999, countrycodePolpal: 'DE' })).rejects.toThrow('Invalid polpalId');
    });

    it('throws when country not found', async () => {
      vi.mocked(prisma.entities.findUnique).mockResolvedValue({ polpalId: 100 } as never);
      vi.mocked(prisma.countries.findUnique).mockResolvedValue(null);
      await expect(createEntitiesInCountries(1, { polpalId: 100, countrycodePolpal: 'XX' })).rejects.toThrow('Invalid countrycodePolpal');
    });
  });

  describe('deleteEntitiesInCountries', () => {
    it('deletes and logs changelog', async () => {
      const existing = { entityInCountryId: 1, polpalId: 100, countrycodePolpal: 'DE' };
      vi.mocked(prisma.entitiesInCountries.findUnique).mockResolvedValue(existing as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);
      vi.mocked(prisma.entitiesInCountries.delete).mockResolvedValue(existing as never);

      await deleteEntitiesInCountries(1, 1);
      expect(logChangelog).toHaveBeenCalledOnce();
      expect(prisma.entitiesInCountries.delete).toHaveBeenCalled();
    });

    it('throws when not found', async () => {
      vi.mocked(prisma.entitiesInCountries.findUnique).mockResolvedValue(null);
      await expect(deleteEntitiesInCountries(999, 1)).rejects.toThrow('Entities in countries entry not found');
    });
  });

  describe('getEntityInfoByPolpalId', () => {
    it('returns entity with country includes', async () => {
      const mockData = { polpalId: 100, EntitiesInCountries: [] };
      vi.mocked(prisma.entities.findUnique).mockResolvedValue(mockData as never);
      const result = await getEntityInfoByPolpalId(100);
      expect(result).toEqual(mockData);
    });
  });

  describe('getEntitiesForLinking', () => {
    const mockEntity = {
      Entities: {
        polpalId: 100, partyfactsId: null, nameShort: 'SPD', nameEnglish: 'SPD', name: 'SPD',
        entityType: 'PARTY', wikipediaUrl: null, wikidataId: null, color: null,
        EntityNames: [],
      },
    };

    it('formats entities with appearance data for logged-in user', async () => {
      vi.mocked(prisma.entitiesInCountries.findMany).mockResolvedValue([mockEntity] as never);
      vi.mocked(prisma.linksEntryToEntity.findMany).mockResolvedValue([
        { polpalId: 100, uniqueObservationId: 'u1' },
        { polpalId: 100, uniqueObservationId: 'u2' },
      ] as never);
      vi.mocked(prisma.entries.findMany).mockResolvedValue([
        { uniqueObservationId: 'u1', entryYear: 2000, datasetKey: 'ds1' },
        { uniqueObservationId: 'u2', entryYear: 2010, datasetKey: 'ds1' },
      ] as never);

      const result = await getEntitiesForLinking('DE', true);
      expect(result).toHaveLength(1);
      expect(result[0].appearanceFirst).toBe(2000);
      expect(result[0].appearanceLast).toBe(2010);
      expect(result[0].datasetCount).toBe(1);
    });

    it('maps entities without any links to null/zero appearances', async () => {
      vi.mocked(prisma.entitiesInCountries.findMany).mockResolvedValue([
        mockEntity,
        { Entities: { ...mockEntity.Entities, polpalId: 101 } },
      ] as never);
      vi.mocked(prisma.linksEntryToEntity.findMany).mockResolvedValue([] as never);

      const result = await getEntitiesForLinking('DE', true);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ polpalId: 100, appearanceFirst: null, appearanceLast: null, datasetCount: 0 });
      expect(result[1]).toMatchObject({ polpalId: 101, appearanceFirst: null, appearanceLast: null, datasetCount: 0 });
      expect(prisma.entries.findMany).not.toHaveBeenCalled();
    });

    it('computes distinct dataset count and filters future years for anonymous users', async () => {
      vi.mocked(prisma.entitiesInCountries.findMany).mockResolvedValue([mockEntity] as never);
      vi.mocked(prisma.linksEntryToEntity.findMany).mockResolvedValue([
        { polpalId: 100, uniqueObservationId: 'u1' },
        { polpalId: 100, uniqueObservationId: 'u2' },
        { polpalId: 100, uniqueObservationId: 'u3' },
      ] as never);
      vi.mocked(prisma.entries.findMany).mockResolvedValue([
        { uniqueObservationId: 'u1', entryYear: 1990, datasetKey: 'ds1' },
        { uniqueObservationId: 'u2', entryYear: 2030, datasetKey: 'ds2' },
        { uniqueObservationId: 'u3', entryYear: 2020, datasetKey: 'ds2' },
      ] as never);

      const result = await getEntitiesForLinking('DE', false);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ appearanceFirst: 1990, appearanceLast: 2020, datasetCount: 2 });
      expect(vi.mocked(prisma.entries.findMany)).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          Projects: { isHidden: false },
          Datasets: { isHidden: false },
          Versions: { isHidden: false },
        }),
      }));
    });

    it('returns empty result when no entities', async () => {
      vi.mocked(prisma.entitiesInCountries.findMany).mockResolvedValue([] as never);
      const result = await getEntitiesForLinking('XX');
      expect(result).toEqual([]);
      expect(prisma.linksEntryToEntity.findMany).not.toHaveBeenCalled();
    });
  });

  describe('catch-log-rethrow', () => {
    it('getEntitiesInCountries rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entitiesInCountries.findMany).mockRejectedValue(dbError);

      await expect(getEntitiesInCountries()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getEntitiesInCountriesByPolpalId rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entitiesInCountries.findMany).mockRejectedValue(dbError);

      await expect(getEntitiesInCountriesByPolpalId(100)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('createEntitiesInCountries rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entities.findUnique).mockResolvedValue({ polpalId: 100 } as never);
      vi.mocked(prisma.countries.findUnique).mockResolvedValue({ countrycodePolpal: 'DE' } as never);
      vi.mocked(prisma.entitiesInCountries.create).mockRejectedValue(dbError);

      await expect(createEntitiesInCountries(1, { polpalId: 100, countrycodePolpal: 'DE' }))
        .rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteEntitiesInCountries rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entitiesInCountries.findUnique).mockResolvedValue({
        entityInCountryId: 1, polpalId: 100, countrycodePolpal: 'DE',
      } as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);
      vi.mocked(prisma.entitiesInCountries.delete).mockRejectedValue(dbError);

      await expect(deleteEntitiesInCountries(1, 1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getEntityInfoByPolpalId rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entities.findUnique).mockRejectedValue(dbError);

      await expect(getEntityInfoByPolpalId(100)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getEntityInfosByCountrycode rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entitiesInCountries.findMany).mockRejectedValue(dbError);

      await expect(getEntityInfosByCountrycode('DE')).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getGroupingsByPolpalId rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entitiesInCountries.findMany).mockRejectedValue(dbError);

      await expect(getGroupingsByPolpalId(100)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getEntitiesByPolpalId rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entitiesInCountries.findMany).mockRejectedValue(dbError);

      await expect(getEntitiesByPolpalId(100)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getGroupingsInCountries rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entitiesInCountries.findMany).mockRejectedValue(dbError);

      await expect(getGroupingsInCountries()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getEntitiesForLinking rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entitiesInCountries.findMany).mockRejectedValue(dbError);

      await expect(getEntitiesForLinking('DE', true)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
