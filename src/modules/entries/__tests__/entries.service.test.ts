import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockLogger } from '@/__test-utils__/mocks';

vi.mock('@/lib/server/prisma.server', () => ({ prisma: mockPrisma() }));
vi.mock('@/lib/server/logger.server', () => ({ default: mockLogger() }));
vi.mock('@/lib/server/changelogLogger', () => ({ logChangelog: vi.fn() }));
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));

import { prisma } from '@/lib/server/prisma.server';
import { logChangelog } from '@/lib/server/changelogLogger';
import logger from '@/lib/server/logger.server';
import {
  getEntriesByVersionCountry,
  getGroupedEntriesByCountry,
  importEntriesStreaming,
  getEntriesForSync,
  syncEntries,
  getEntryByEntryId,
  deleteEntriesByVersion,
  getUnknownEntries,
  getEntriesByVersionPaginated,
  getEntriesByVersionCountryAggregated,
  getEntriesByVersionEntity,
  getEntriesWithLinksForMatching,
} from '../entries.service';

describe('entries.service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getEntriesByVersionCountry', () => {
    it('returns entries for a version and country', async () => {
      vi.mocked(prisma.entries.findMany).mockResolvedValue([{
        entryId: 1, entryYear: 2020, entryMonth: null, entryDay: null,
        entryEntityIdVar: 'gdp', entryEntityId: 'DE01', entryEntityNameShort: 'DE GDP',
        entryEntityNameEnglish: 'DE GDP', entryEntityName: 'DE GDP', additionalInformation: null,
        uniqueObservationId: 'obs1', note: null,
        Projects: { isHidden: false, projectKey: 'p1', projectNameShort: 'P', projectName: 'Proj' },
        Datasets: { isHidden: false, datasetKey: 'ds1', datasetNameShort: 'D', datasetName: 'Data' },
        Versions: { isHidden: false, isHiddenReason: null, versionKey: 'v1', version: '1.0', versionName: null, commentVersion: null, commentEntries: null },
        Countries: { countrycodePolpal: 'DE', countryname: 'Germany', iso2c: 'DE' },
        LinksEntryToEntity: [],
      }] as never);

      const result = await getEntriesByVersionCountry('v1', 'DE');
      expect(result).toBeDefined();
      expect(result.Entries).toHaveLength(1);
    });

    it('returns empty array when no entries', async () => {
      vi.mocked(prisma.entries.findMany).mockResolvedValue([] as never);
      const result = await getEntriesByVersionCountry('v1', 'XX');
      expect(result).toEqual([]);
    });
  });

  describe('getGroupedEntriesByCountry', () => {
    it('returns grouped country data', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{
        countrycodePolpal: 'DE', countryname: 'Germany', iso2c: 'DE',
        entryCount: BigInt(100), linkedEntryCount: BigInt(50), uniquePolpalIdsCount: BigInt(10),
      }] as never);
      vi.mocked(prisma.versions.findUnique).mockResolvedValue({
        version: '1.0', versionName: null, versionUrl: '', versionCitation: null,
        Datasets: { datasetNameShort: 'D', datasetName: 'Data', Projects: { projectNameShort: 'P', projectName: 'Proj' } },
      } as never);
      vi.mocked(prisma.entries.aggregate).mockResolvedValue({
        _min: { createdAt: new Date() }, _max: { updatedAt: new Date() },
      } as never);
      vi.mocked(prisma.entries.findFirst).mockResolvedValue({ usedFile: 'test.csv', dateDownloaded: '2024-01-01' } as never);

      const result = await getGroupedEntriesByCountry('v1');
      expect(result.countries).toHaveLength(1);
      expect(result.countries[0].entryCount).toBe(100);
    });
  });

  describe('importEntriesStreaming', () => {
    it('imports entries in chunks and logs changelog', async () => {
      vi.mocked(prisma.entries.createMany).mockResolvedValue({ count: 2 } as never);
      vi.mocked(prisma.versions.findUnique).mockResolvedValue({ versionId: 1 } as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      const entries = [
        { usedFile: 'test.csv', dateDownloaded: '2024-01-01', projectKey: 'p1', datasetKey: 'ds1', versionKey: 'v1',
          entryEntityIdVar: 'gdp', entryEntityId: 'DE01', countrycodePolpal: 'DE', uniqueObservationId: 'obs1' },
        { usedFile: 'test.csv', dateDownloaded: '2024-01-01', projectKey: 'p1', datasetKey: 'ds1', versionKey: 'v1',
          entryEntityIdVar: 'pop', entryEntityId: 'DE02', countrycodePolpal: 'DE', uniqueObservationId: 'obs2' },
      ];

      const result = await importEntriesStreaming(1, entries);
      expect(result.totalCreated).toBe(2);
      expect(result.streaming).toBe(true);
      expect(logChangelog).toHaveBeenCalledOnce();
    });

    it('returns zero for empty entries', async () => {
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);
      const result = await importEntriesStreaming(1, []);
      expect(result.totalCreated).toBe(0);
    });
  });

  describe('getEntriesForSync', () => {
    it('returns all entries for a version', async () => {
      vi.mocked(prisma.entries.findMany).mockResolvedValue([] as never);
      const result = await getEntriesForSync('v1');
      expect(result).toEqual([]);
    });
  });

  describe('syncEntries', () => {
    it('creates, updates, and deletes entries with changelogs', async () => {
      vi.mocked(prisma.entries.createMany).mockResolvedValue({ count: 1 } as never);
      vi.mocked(prisma.entries.update).mockResolvedValue({} as never);
      vi.mocked(prisma.entries.deleteMany).mockResolvedValue({ count: 1 } as never);
      vi.mocked(prisma.entries.findFirst).mockResolvedValue({ versionKey: 'v1' } as never);
      vi.mocked(prisma.versions.findUnique).mockResolvedValue({ versionId: 1 } as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      const result = await syncEntries(1,
        [{ usedFile: 't.csv', dateDownloaded: '2024', projectKey: 'p1', datasetKey: 'ds1', versionKey: 'v1',
          entryEntityIdVar: 'gdp', entryEntityId: 'DE01', countrycodePolpal: 'DE', uniqueObservationId: 'obs1' }],
        [{ usedFile: 't.csv', dateDownloaded: '2024', projectKey: 'p1', datasetKey: 'ds1', versionKey: 'v1',
          entryEntityIdVar: 'gdp', entryEntityId: 'DE01', countrycodePolpal: 'DE', uniqueObservationId: 'obs2' }],
        ['obs3'],
      );
      expect(result.created).toBe(1);
      expect(result.updated).toBe(1);
      expect(result.deleted).toBe(1);
      expect(logChangelog).toHaveBeenCalledTimes(3);
    });

    it('returns zeros when nothing to sync', async () => {
      const result = await syncEntries(1, [], [], []);
      expect(result).toEqual({ created: 0, updated: 0, deleted: 0 });
    });
  });

  describe('getEntryByEntryId', () => {
    it('returns null when not found', async () => {
      vi.mocked(prisma.entries.findUnique).mockResolvedValue(null);
      const result = await getEntryByEntryId(999);
      expect(result).toBeNull();
    });

    it('returns entry with appearance data when found', async () => {
      vi.mocked(prisma.entries.findUnique).mockResolvedValue({
        entryId: 1, countrycodePolpal: 'DE', entryYear: 2020,
        LinksEntryToEntity: [{
          Entities: { polpalId: 100, nameShort: 'SPD', nameEnglish: 'SPD', name: 'SPD', entityType: 'PARTY', wikipediaUrl: null, wikidataId: null, EntityNames: [] },
          ValidationLinks: [],
          polpalId: 100,
        }],
        Countries: { countrycodePolpal: 'DE', countryname: 'Germany', iso2c: 'DE' },
        Projects: { projectNameShort: 'P', projectName: 'Proj' },
        Datasets: { datasetNameShort: 'D', datasetName: 'Data' },
        Versions: { version: '1.0', versionName: null },
      } as never);
      vi.mocked(prisma.linksEntryToEntity.findMany).mockResolvedValue([{
        polpalId: 100,
        Entries: { entryYear: 2020 },
      }] as never);

      const result = await getEntryByEntryId(1);
      expect(result).not.toBeNull();
      expect(result!.LinksEntryToEntity[0].Entities.appearanceFirst).toBe(2020);
    });

    it('returns entry without links when no LinksEntryToEntity', async () => {
      vi.mocked(prisma.entries.findUnique).mockResolvedValue({
        entryId: 1, countrycodePolpal: 'DE', LinksEntryToEntity: [],
        Countries: {}, Projects: {}, Datasets: {}, Versions: {},
      } as never);
      const result = await getEntryByEntryId(1);
      expect(result).not.toBeNull();
    });
  });

  describe('deleteEntriesByVersion', () => {
    it('deletes entries and returns count', async () => {
      vi.mocked(prisma.entries.deleteMany).mockResolvedValue({ count: 50 } as never);
      const result = await deleteEntriesByVersion('v1');
      expect(result).toBe(50);
    });
  });

  describe('getUnknownEntries', () => {
    it('returns entries linked to UNKNOWN entities', async () => {
      vi.mocked(prisma.entries.findMany).mockResolvedValue([] as never);
      const result = await getUnknownEntries();
      expect(result).toEqual([]);
    });
  });

  describe('getEntriesByVersionPaginated', () => {
    it('returns paginated entries with link counts', async () => {
      vi.mocked(prisma.entries.findMany).mockResolvedValue([{
        entryId: 1, countrycodePolpal: 'DE', entryCountry: 'Germany', entryYear: 2020,
        entryMonth: null, entryDay: null, entryEntityIdVar: 'gdp', entryEntityId: 'DE01',
        entryEntityNameShort: 'DE', entryEntityNameEnglish: 'DE', entryEntityName: 'Germany',
        uniqueObservationId: 'obs1',
        Countries: { countryname: 'Germany', iso2c: 'DE' },
        Projects: { projectNameShort: 'P', projectName: 'Proj' },
        Datasets: { datasetNameShort: 'D', datasetName: 'Data' },
        Versions: { version: '1.0', versionName: null },
        _count: { LinksEntryToEntity: 2 },
      }] as never);

      const result = await getEntriesByVersionPaginated('v1');
      expect(result).toHaveLength(1);
      expect(result[0].linkCount).toBe(2);
    });
  });

  describe('getEntriesByVersionCountryAggregated', () => {
    function makeEntry(overrides: Record<string, unknown>) {
      return {
        entryId: 1,
        entryYear: 2020,
        entryMonth: null,
        entryDay: null,
        entryEntityIdVar: 'gdp',
        entryEntityId: 'DE01',
        entryEntityNameShort: 'DE GDP',
        entryEntityNameEnglish: 'DE GDP',
        entryEntityName: 'DE GDP',
        uniqueObservationId: 'obs1',
        Projects: { projectNameShort: 'P', projectName: 'Proj' },
        Datasets: { datasetNameShort: 'D', datasetName: 'Data' },
        Versions: { version: '1.0', versionName: null },
        Countries: { countrycodePolpal: 'DE', countryname: 'Germany', iso2c: 'DE' },
        LinksEntryToEntity: [],
        ...overrides,
      };
    }

    it('returns empty array when no entries found', async () => {
      vi.mocked(prisma.entries.findMany).mockResolvedValue([] as never);
      const result = await getEntriesByVersionCountryAggregated('v1', 'XX');
      expect(result).toEqual([]);
    });

    it('groups entries with same entity together', async () => {
      vi.mocked(prisma.entries.findMany).mockResolvedValue([
        makeEntry({ entryId: 1, uniqueObservationId: 'obs1', entryYear: 2020, entryEntityNameShort: 'GDP' }),
        makeEntry({ entryId: 2, uniqueObservationId: 'obs2', entryYear: 2021, entryEntityNameShort: 'GDP' }),
      ] as never);

      const result = await getEntriesByVersionCountryAggregated('v1', 'DE');
      expect(result).toHaveLength(1);
      expect(result[0].entryEntityIdVar).toBe('gdp');
      expect(result[0].entryEntityId).toBe('DE01');
      expect(result[0].allUniqueObservationIds.uniqueObservationIds).toHaveLength(2);
    });

    it('returns linkedComplete "Complete" when all entries have links', async () => {
      vi.mocked(prisma.entries.findMany).mockResolvedValue([
        makeEntry({
          entryId: 1, uniqueObservationId: 'obs1',
          LinksEntryToEntity: [{ uniqueObservationId: 'obs1', polpalId: 100, Entities: { nameShort: 'X', nameEnglish: 'X', polpalId: 100 } }],
        }),
      ] as never);

      const result = await getEntriesByVersionCountryAggregated('v1', 'DE');
      expect(result).toHaveLength(1);
      expect(result[0].linkedComplete).toBe('Complete');
    });

    it('returns linkedComplete "None" when no entries have links', async () => {
      vi.mocked(prisma.entries.findMany).mockResolvedValue([
        makeEntry({ entryId: 1, uniqueObservationId: 'obs1', LinksEntryToEntity: [] }),
      ] as never);

      const result = await getEntriesByVersionCountryAggregated('v1', 'DE');
      expect(result).toHaveLength(1);
      expect(result[0].linkedComplete).toBe('None');
    });

    it('returns linkedComplete "Incomplete" when some entries have links', async () => {
      vi.mocked(prisma.entries.findMany).mockResolvedValue([
        makeEntry({
          entryId: 1, uniqueObservationId: 'obs1',
          LinksEntryToEntity: [{ uniqueObservationId: 'obs1', polpalId: 100, Entities: { nameShort: 'X', nameEnglish: 'X', polpalId: 100 } }],
        }),
        makeEntry({
          entryId: 2, uniqueObservationId: 'obs2',
          LinksEntryToEntity: [],
        }),
      ] as never);

      const result = await getEntriesByVersionCountryAggregated('v1', 'DE');
      expect(result).toHaveLength(1);
      expect(result[0].linkedComplete).toBe('Incomplete');
    });
  });

  describe('getEntriesByVersionEntity', () => {
    const mockEntries = [{
      entryId: 1,
      entryEntityIdVar: 'gdp', entryEntityId: 'DE01',
      entryEntityNameShort: 'GDP', entryEntityNameEnglish: 'DE GDP', entryEntityName: 'Bruttoinlandsprodukt',
      entryYear: 2020, entryMonth: null, entryDay: null,
      additionalInformation: null, note: null, countrycodePolpal: 'DE',
      Countries: { countryname: 'Germany', iso2c: 'DE' },
      LinksEntryToEntity: [{
        polpalId: 100,
        ValidationLinks: [{ validated: 'APPROVED' }],
      }],
    }];

    const mockEntity = {
      polpalId: 100, nameShort: 'SPD', nameEnglish: 'SPD', name: 'SPD',
      entityType: 'PARTY', isHidden: false, wikipediaUrl: null, wikidataId: null,
      EntityNames: [],
      EntitiesInCountries: [{ countrycodePolpal: 'DE', Countries: { countryname: 'Germany' } }],
    };

    const mockVersion = {
      versionKey: 'v1', version: '1.0', versionName: null, projectKey: 'p1', datasetKey: 'ds1',
      Projects: { projectNameShort: 'P', projectName: 'Proj' },
      Datasets: { datasetNameShort: 'D', datasetName: 'Data' },
    };

    it('returns full entry data with entity and version info', async () => {
      vi.mocked(prisma.entries.findMany).mockResolvedValue(mockEntries as never);
      vi.mocked(prisma.entities.findUnique).mockResolvedValue(mockEntity as never);
      vi.mocked(prisma.versions.findUnique).mockResolvedValue(mockVersion as never);

      const result = await getEntriesByVersionEntity('v1', 100);
      expect(result).not.toBeNull();
      expect(result!.entityPolpalId).toBe(100);
      expect(result!.entityNameShort).toBe('SPD');
      expect(result!.version).toBe('1.0');
      expect(result!.projectNameShort).toBe('P');
      expect(result!.entries).toHaveLength(1);
    });

    it('returns null when entity not found', async () => {
      vi.mocked(prisma.entries.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.entities.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.versions.findUnique).mockResolvedValue(mockVersion as never);

      const result = await getEntriesByVersionEntity('v1', 999);
      expect(result).toBeNull();
    });

    it('computes hasMultipleLinked correctly', async () => {
      vi.mocked(prisma.entries.findMany).mockResolvedValue([{
        ...mockEntries[0],
        LinksEntryToEntity: [
          { polpalId: 100, ValidationLinks: [] },
          { polpalId: 200, ValidationLinks: [] },
        ],
      }] as never);
      vi.mocked(prisma.entities.findUnique).mockResolvedValue(mockEntity as never);
      vi.mocked(prisma.versions.findUnique).mockResolvedValue(mockVersion as never);

      const result = await getEntriesByVersionEntity('v1', 100);
      expect(result!.entries[0].hasMultipleLinked).toBe(true);
    });

    it('computes hasApproved and hasRejected flags', async () => {
      vi.mocked(prisma.entries.findMany).mockResolvedValue([{
        ...mockEntries[0],
        LinksEntryToEntity: [{
          polpalId: 100,
          ValidationLinks: [{ validated: 'APPROVED' }, { validated: 'REJECTED' }],
        }],
      }] as never);
      vi.mocked(prisma.entities.findUnique).mockResolvedValue(mockEntity as never);
      vi.mocked(prisma.versions.findUnique).mockResolvedValue(mockVersion as never);

      const result = await getEntriesByVersionEntity('v1', 100);
      expect(result!.entries[0].hasApproved).toBe(true);
      expect(result!.entries[0].hasRejected).toBe(true);
    });
  });

  describe('getEntriesWithLinksForMatching', () => {
    it('returns entries with linked entities', async () => {
      vi.mocked(prisma.entries.findMany).mockResolvedValue([{
        uniqueObservationId: 'obs1',
        projectKey: 'p1', datasetKey: 'ds1',
        entryCountryVar: 'countrycodePolpal', entryCountry: 'DE',
        entryYearVar: 'entryYear', entryYear: 2020,
        entryMonthVar: null, entryMonth: null,
        entryDayVar: null, entryDay: null,
        entryEntityIdVar: 'gdp', entryEntityId: 'DE01',
        entryEntityNameShortVar: 'nameShort', entryEntityNameShort: 'GDP',
        entryEntityNameEnglishVar: null, entryEntityNameEnglish: 'GDP',
        entryEntityNameVar: null, entryEntityName: 'Bruttoinland',
        additionalInformation: null, countrycodePolpal: 'DE', note: null,
        LinksEntryToEntity: [{
          polpalId: 100, startYear: 2020, startMonth: null, startDay: null,
          endYear: null, endMonth: null, endDay: null, comment: null,
          Entities: { nameShort: 'SPD', nameEnglish: 'SPD' },
        }],
      }] as never);

      const result = await getEntriesWithLinksForMatching('v1');
      expect(result).toHaveLength(1);
      expect(result[0].LinksEntryToEntity).toHaveLength(1);
      expect(result[0].LinksEntryToEntity[0].Entities.nameShort).toBe('SPD');
    });

    it('returns empty array when no entries found', async () => {
      vi.mocked(prisma.entries.findMany).mockResolvedValue([] as never);
      const result = await getEntriesWithLinksForMatching('v1');
      expect(result).toEqual([]);
    });
  });

  describe('catch-log-rethrow', () => {
    it('getEntriesByVersionCountry rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entries.findMany).mockRejectedValue(dbError);

      await expect(getEntriesByVersionCountry('v1', 'DE')).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getGroupedEntriesByCountry rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.$queryRaw).mockRejectedValue(dbError);

      await expect(getGroupedEntriesByCountry('v1')).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getEntriesByVersionEntity rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entries.findMany).mockRejectedValue(dbError);

      await expect(getEntriesByVersionEntity('v1', 100)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getEntriesForSync rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entries.findMany).mockRejectedValue(dbError);

      await expect(getEntriesForSync('v1')).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getEntriesWithLinksForMatching rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entries.findMany).mockRejectedValue(dbError);

      await expect(getEntriesWithLinksForMatching('v1')).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
