import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockLogger } from '@/__test-utils__/mocks';

vi.mock('@/lib/server/prisma.server', () => ({ prisma: mockPrisma() }));
vi.mock('@/lib/server/logger.server', () => ({ default: mockLogger() }));

import { prisma } from '@/lib/server/prisma.server';
import {
  streamDownloadCountries,
  streamDownloadEntities,
  streamDownloadGroupings,
  streamDownloadEntriesByVersion,
  streamDownloadVersionsOverview,
  streamDownloadEntityNames,
  getEntityFilters,
  getGroupingFilters,
  getEntryFiltersForVersion,
  getEntityNameFilters,
} from '../downloads.service';

async function collectGenerator(gen: AsyncGenerator): Promise<string[]> {
  const chunks: string[] = [];
  for await (const chunk of gen) chunks.push(chunk);
  return chunks;
}

describe('downloads.service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('streamDownloadCountries', () => {
    it('yields header row first', async () => {
      vi.mocked(prisma.countries.findMany).mockResolvedValueOnce([]);

      const chunks = await collectGenerator(streamDownloadCountries());

      expect(chunks[0]).toMatch(/^"?\uFEFF/);
      expect(chunks[0]).toContain('countrycodePolpal');
      expect(chunks[0]).toContain('isCountry');
    });

    it('yields country data rows', async () => {
      vi.mocked(prisma.countries.findMany)
        .mockResolvedValueOnce([
          { countrycodePolpal: 'US', isCountry: true, countryname: 'United States', region: 'Americas' },
        ] as never)
        .mockResolvedValueOnce([]);

      const chunks = await collectGenerator(streamDownloadCountries());

      expect(chunks).toHaveLength(2);
      expect(chunks[1]).toContain('US');
      expect(chunks[1]).toContain('true');
      expect(chunks[1]).toContain('United States');
      expect(chunks[1]).toContain('Americas');
    });

    it('paginates in batches of 500', async () => {
      const bigBatch = Array.from({ length: 500 }, (_, i) => ({
        countrycodePolpal: `C${i}`, isCountry: true, countryname: `Country ${i}`, region: 'Europe',
      }));
      vi.mocked(prisma.countries.findMany)
        .mockResolvedValueOnce(bigBatch as never)
        .mockResolvedValueOnce([]);

      const chunks = await collectGenerator(streamDownloadCountries());

      expect(chunks).toHaveLength(501); // 1 header + 500 rows
      expect(prisma.countries.findMany).toHaveBeenCalledWith({ skip: 0, take: 500 });
      expect(prisma.countries.findMany).toHaveBeenCalledWith({ skip: 500, take: 500 });
    });
  });

  describe('streamDownloadEntities', () => {
    it('yields entity CSV with country codes joined by ||', async () => {
      vi.mocked(prisma.entities.findMany)
        .mockResolvedValueOnce([
          {
            polpalId: 1, nameShort: 'SPD', nameEnglish: 'Social Democrats', name: 'SPD',
            entityType: 'PARTY', wikipediaUrl: null, wikidataId: null,
            EntitiesInCountries: [{ countrycodePolpal: 'DE' }, { countrycodePolpal: 'AT' }],
          },
        ] as never)
        .mockResolvedValueOnce([]);

      const chunks = await collectGenerator(streamDownloadEntities());

      expect(chunks[0]).toContain('polpalId');
      expect(chunks[1]).toContain('SPD');
      expect(chunks[1]).toContain('DE||AT');
    });

    it('applies country filter', async () => {
      vi.mocked(prisma.entities.findMany).mockResolvedValueOnce([]);

      await collectGenerator(streamDownloadEntities({ countries: ['DE'] }));

      const where = vi.mocked(prisma.entities.findMany).mock.calls[0][0].where;
      expect(where).toHaveProperty('EntitiesInCountries');
    });

    it('applies region filter when no countries', async () => {
      vi.mocked(prisma.entities.findMany).mockResolvedValueOnce([]);

      await collectGenerator(streamDownloadEntities({ regions: ['Europe'] }));

      const where = vi.mocked(prisma.entities.findMany).mock.calls[0][0].where;
      expect(where).toHaveProperty('EntitiesInCountries');
    });

    it('filters out hidden entities', async () => {
      vi.mocked(prisma.entities.findMany).mockResolvedValueOnce([]);

      await collectGenerator(streamDownloadEntities());

      const where = vi.mocked(prisma.entities.findMany).mock.calls[0][0].where;
      expect(where).toHaveProperty('isHidden', false);
    });
  });

  describe('streamDownloadGroupings', () => {
    it('yields grouping rows with member info', async () => {
      vi.mocked(prisma.groupingMembers.findMany)
        .mockResolvedValueOnce([
          {
            groupingMemberId: 1,
            Groupings: { polpalId: 100, nameShort: 'EU', nameEnglish: 'European Union' },
            Entities: { polpalId: 200, nameShort: 'DE', nameEnglish: 'Germany' },
            startYear: 2000, startMonth: null, startDay: null,
            endYear: null, endMonth: null, endDay: null,
          },
        ] as never)
        .mockResolvedValueOnce([]);

      const chunks = await collectGenerator(streamDownloadGroupings());

      expect(chunks[0]).toContain('grouping_PolPaL_ID');
      expect(chunks[1]).toContain('EU');
      expect(chunks[1]).toContain('Germany');
      expect(chunks[1]).toContain('2000');
    });

    it('filters out hidden groupings and hidden members', async () => {
      vi.mocked(prisma.groupingMembers.findMany).mockResolvedValueOnce([]);

      await collectGenerator(streamDownloadGroupings());

      const where = vi.mocked(prisma.groupingMembers.findMany).mock.calls[0][0].where;
      expect(where.Groupings).toMatchObject({ entityType: 'GROUPING', isHidden: false });
      expect(where.Entities).toHaveProperty('isHidden', false);
    });
  });

  describe('streamDownloadEntriesByVersion', () => {
    it('yields short format fields when short=true', async () => {
      vi.mocked(prisma.entries.findMany)
        .mockResolvedValueOnce([
          {
            countrycodePolpal: 'US', entryEntityId: 'E1', entryEntityIdVar: 'var1',
            entryEntityNameShort: 'Test', entryEntityNameEnglish: 'Test English',
            entryEntityName: 'Full Name', entryCountry: 'USA',
            entryYear: 2020, entryMonth: null, entryDay: null,
            entryEntityNameShortVar: null, entryEntityNameEnglishVar: null,
            entryEntityNameVar: null, entryCountryVar: null,
            entryYearVar: null, entryMonthVar: null, entryDayVar: null,
            projectKey: 'p1', datasetKey: 'd1', versionKey: 'v1',
            dateDownloaded: null, usedFile: null, uniqueObservationId: 'obs1',
            LinksEntryToEntity: [{
              polpalId: 10, startYear: 2020, startMonth: null, startDay: null,
              endYear: null, endMonth: null, endDay: null,
              Entities: { nameShort: 'Party', nameEnglish: 'Party EN', name: 'Party Full', entityType: 'PARTY' },
            }],
          },
        ] as never)
        .mockResolvedValueOnce([]);

      const chunks = await collectGenerator(streamDownloadEntriesByVersion('v1', { short: true }));

      expect(chunks[0]).toContain('countrycodePolpal');
      expect(chunks[0]).not.toContain('versionKey'); // short format omits version info
      expect(chunks[1]).toContain('Test');
      expect(chunks[1]).toContain('USA');
    });

    it('yields full format fields by default', async () => {
      vi.mocked(prisma.entries.findMany)
        .mockResolvedValueOnce([
          {
            countrycodePolpal: 'US', entryEntityId: 'E1', entryEntityIdVar: 'var1',
            entryEntityNameShort: 'Test', entryEntityNameEnglish: 'Test EN',
            entryEntityName: 'Full', entryCountry: 'USA',
            entryYear: 2020, entryMonth: null, entryDay: null,
            entryEntityNameShortVar: null, entryEntityNameEnglishVar: null,
            entryEntityNameVar: null, entryCountryVar: null,
            entryYearVar: null, entryMonthVar: null, entryDayVar: null,
            projectKey: 'p1', datasetKey: 'd1', versionKey: 'v1',
            dateDownloaded: null, usedFile: null, uniqueObservationId: 'obs1',
            LinksEntryToEntity: [],
          },
        ] as never)
        .mockResolvedValueOnce([]);

      const chunks = await collectGenerator(streamDownloadEntriesByVersion('v1'));

      expect(chunks[0]).toContain('versionKey');
      expect(chunks[0]).toContain('projectKey');
    });

    it('applies country filter', async () => {
      vi.mocked(prisma.entries.findMany).mockResolvedValueOnce([]);

      await collectGenerator(streamDownloadEntriesByVersion('v1', { countries: ['US'] }));

      const where = vi.mocked(prisma.entries.findMany).mock.calls[0][0].where;
      expect(where.countrycodePolpal).toEqual({ in: ['US'] });
    });

    it('applies year range filter', async () => {
      vi.mocked(prisma.entries.findMany).mockResolvedValueOnce([]);

      await collectGenerator(streamDownloadEntriesByVersion('v1', { yearFrom: 2000, yearTo: 2020 }));

      const where = vi.mocked(prisma.entries.findMany).mock.calls[0][0].where;
      expect(where.entryYear).toEqual({ gte: 2000, lte: 2020 });
    });

    it('applies variable filter', async () => {
      vi.mocked(prisma.entries.findMany).mockResolvedValueOnce([]);

      await collectGenerator(streamDownloadEntriesByVersion('v1', { variables: ['var1'] }));

      const where = vi.mocked(prisma.entries.findMany).mock.calls[0][0].where;
      expect(where.entryEntityIdVar).toEqual({ in: ['var1'] });
    });

    it('filters out entries of hidden versions by default', async () => {
      vi.mocked(prisma.entries.findMany).mockResolvedValueOnce([]);

      await collectGenerator(streamDownloadEntriesByVersion('v1'));

      const where = vi.mocked(prisma.entries.findMany).mock.calls[0][0].where;
      expect(where.Versions).toEqual({ isHidden: false });
    });

    it('includes entries of hidden versions when allowHidden is true', async () => {
      vi.mocked(prisma.entries.findMany).mockResolvedValueOnce([]);

      await collectGenerator(streamDownloadEntriesByVersion('v1', {}, true));

      const where = vi.mocked(prisma.entries.findMany).mock.calls[0][0].where;
      expect(where).not.toHaveProperty('Versions');
    });
  });

  describe('streamDownloadVersionsOverview', () => {
    it('yields versions overview CSV', async () => {
      vi.mocked(prisma.versions.findMany)
        .mockResolvedValueOnce([
          {
            versionKey: 'v1', version: '1.0', versionName: 'First', versionUrl: 'http://example.com',
            versionCitation: ['Citation 1'],
            Projects: { projectKey: 'p1', projectNameShort: 'Proj', projectName: 'Project', projectUrl: null, projectDescription: null },
            Datasets: { datasetKey: 'd1', datasetNameShort: 'DS', datasetName: 'Dataset', datasetUrl: null, datasetDescription: null },
          },
        ] as never)
        .mockResolvedValueOnce([]);

      const chunks = await collectGenerator(streamDownloadVersionsOverview(true));

      expect(chunks[0]).toContain('projectKey');
      expect(chunks[1]).toContain('v1');
      expect(chunks[1]).toContain('Proj');
      expect(chunks[1]).toContain('DS');
    });

    it('applies hidden filter when allowHidden is false', async () => {
      vi.mocked(prisma.versions.findMany).mockResolvedValueOnce([]);

      await collectGenerator(streamDownloadVersionsOverview(false));

      const where = vi.mocked(prisma.versions.findMany).mock.calls[0][0].where;
      expect(where).toHaveProperty('isHidden', false);
    });

    it('applies no filter when allowHidden is true', async () => {
      vi.mocked(prisma.versions.findMany).mockResolvedValueOnce([]);

      await collectGenerator(streamDownloadVersionsOverview(true));

      const where = vi.mocked(prisma.versions.findMany).mock.calls[0][0].where;
      expect(where).toEqual({});
    });
  });

  describe('streamDownloadEntityNames', () => {
    it('yields entity name rows', async () => {
      vi.mocked(prisma.entityNames.findMany)
        .mockResolvedValueOnce([
          {
            polpalId: 1, nameShort: 'EN', name: 'English Name',
            language: 'en', startYear: 2000, startMonth: null, startDay: null,
            endYear: null, endMonth: null, endDay: null,
            Entities: { nameShort: 'Party', nameEnglish: 'Party EN', name: 'Party Full', entityType: 'PARTY' },
          },
        ] as never)
        .mockResolvedValueOnce([]);

      const chunks = await collectGenerator(streamDownloadEntityNames());

      expect(chunks[0]).toContain('polpalId');
      expect(chunks[0]).toContain('language');
      expect(chunks[1]).toContain('English Name');
      expect(chunks[1]).toContain('en');
    });

    it('filters out names of hidden entities', async () => {
      vi.mocked(prisma.entityNames.findMany).mockResolvedValueOnce([]);

      await collectGenerator(streamDownloadEntityNames());

      const where = vi.mocked(prisma.entityNames.findMany).mock.calls[0][0].where;
      expect(where.Entities).toHaveProperty('isHidden', false);
    });
  });

  describe('getEntityFilters', () => {
    it('returns countries and regions', async () => {
      vi.mocked(prisma.entitiesInCountries.findMany).mockResolvedValueOnce([
        { countrycodePolpal: 'DE', Countries: { countryname: 'Germany', region: 'Europe', iso2c: 'DE' } },
      ] as never);
      vi.mocked(prisma.countries.findMany).mockResolvedValueOnce([
        { region: 'Europe' },
      ] as never);

      const result = await getEntityFilters();

      expect(result.countries).toHaveLength(1);
      expect(result.countries[0].countrycodePolpal).toBe('DE');
      expect(result.regions).toContain('Europe');
    });
  });

  describe('getGroupingFilters', () => {
    it('returns countries and regions for groupings', async () => {
      vi.mocked(prisma.entitiesInCountries.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.countries.findMany).mockResolvedValueOnce([]);

      const result = await getGroupingFilters();

      expect(result).toHaveProperty('countries');
      expect(result).toHaveProperty('regions');
    });
  });

  describe('getEntryFiltersForVersion', () => {
    it('returns countries, regions, year range, and variables', async () => {
      vi.mocked(prisma.entries.findMany)
        .mockResolvedValueOnce([{ countrycodePolpal: 'US', Countries: { countryname: 'USA', region: 'Americas', iso2c: 'US' } }] as never)
        .mockResolvedValueOnce([{ entryEntityIdVar: 'var1' }] as never);
      vi.mocked(prisma.entries.aggregate).mockResolvedValueOnce({ _min: { entryYear: 2000 }, _max: { entryYear: 2023 } } as never);
      vi.mocked(prisma.countries.findMany).mockResolvedValueOnce([{ region: 'Americas' }] as never);

      const result = await getEntryFiltersForVersion('v1');

      expect(result.countries).toHaveLength(1);
      expect(result.yearMin).toBe(2000);
      expect(result.yearMax).toBe(2023);
      expect(result.variables).toContain('var1');
      expect(result.regions).toContain('Americas');
    });
  });

  describe('CSV formula injection (escapeCsvCell via streamDownloadCountries)', () => {
    it('prefixes =SUM(A1) with a single-quote to prevent formula injection', async () => {
      vi.mocked(prisma.countries.findMany)
        .mockResolvedValueOnce([
          { countrycodePolpal: 'US', isCountry: true, countryname: '=SUM(A1)', region: 'Americas' },
        ] as never)
        .mockResolvedValueOnce([]);

      const chunks = await collectGenerator(streamDownloadCountries());
      const dataRow = chunks[1];

      expect(dataRow).toContain("'=SUM(A1)");
    });

    it('prefixes fields starting with + with a single-quote', async () => {
      vi.mocked(prisma.countries.findMany)
        .mockResolvedValueOnce([
          { countrycodePolpal: 'DE', isCountry: true, countryname: '+cmd|"/C calc"!A0', region: 'Europe' },
        ] as never)
        .mockResolvedValueOnce([]);

      const chunks = await collectGenerator(streamDownloadCountries());
      const dataRow = chunks[1];

      expect(dataRow).toContain("'+cmd|\"\"/C calc\"\"!A0");
    });

    it('prefixes fields starting with - with a single-quote', async () => {
      vi.mocked(prisma.countries.findMany)
        .mockResolvedValueOnce([
          { countrycodePolpal: 'FR', isCountry: true, countryname: '-1+cmd|"/C calc"!A0', region: 'Europe' },
        ] as never)
        .mockResolvedValueOnce([]);

      const chunks = await collectGenerator(streamDownloadCountries());
      const dataRow = chunks[1];

      expect(dataRow).toContain("'-1+cmd|\"\"/C calc\"\"!A0");
    });

    it('prefixes fields starting with @ with a single-quote', async () => {
      vi.mocked(prisma.countries.findMany)
        .mockResolvedValueOnce([
          { countrycodePolpal: 'IT', isCountry: true, countryname: '@SUM(1,1)', region: 'Europe' },
        ] as never)
        .mockResolvedValueOnce([]);

      const chunks = await collectGenerator(streamDownloadCountries());
      const dataRow = chunks[1];

      expect(dataRow).toContain("'@SUM(1,1)");
    });

    it('passes normal strings through without modification', async () => {
      vi.mocked(prisma.countries.findMany)
        .mockResolvedValueOnce([
          { countrycodePolpal: 'US', isCountry: true, countryname: 'Hello World', region: 'Americas' },
        ] as never)
        .mockResolvedValueOnce([]);

      const chunks = await collectGenerator(streamDownloadCountries());
      const dataRow = chunks[1];

      expect(dataRow).toContain('"Hello World"');
      expect(dataRow).not.toContain("'Hello World");
    });

    it('passes numeric values through as-is without quoting', async () => {
      vi.mocked(prisma.entities.findMany)
        .mockResolvedValueOnce([
          {
            polpalId: 42, nameShort: 'PT', nameEnglish: 'Party', name: 'Party Full',
            entityType: 'PARTY', wikipediaUrl: null, wikidataId: null,
            EntitiesInCountries: [],
          },
        ] as never)
        .mockResolvedValueOnce([]);

      const chunks = await collectGenerator(streamDownloadEntities());
      const dataRow = chunks[1];

      expect(dataRow).toMatch(/^"?42"?,/);
      expect(dataRow).not.toContain('"42"');
    });

    it('escapes double quotes by doubling them', async () => {
      vi.mocked(prisma.countries.findMany)
        .mockResolvedValueOnce([
          { countrycodePolpal: 'US', isCountry: true, countryname: 'Say "hello"', region: 'Americas' },
        ] as never)
        .mockResolvedValueOnce([]);

      const chunks = await collectGenerator(streamDownloadCountries());
      const dataRow = chunks[1];

      expect(dataRow).toContain('Say ""hello""');
    });
  });

  describe('getEntityNameFilters', () => {
    it('returns countries and regions for entity names', async () => {
      vi.mocked(prisma.entitiesInCountries.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.countries.findMany).mockResolvedValueOnce([]);

      const result = await getEntityNameFilters();

      expect(result).toHaveProperty('countries');
      expect(result).toHaveProperty('regions');
    });
  });
});
