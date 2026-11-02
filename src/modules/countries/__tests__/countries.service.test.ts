import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockLogger } from '@/__test-utils__/mocks';

vi.mock('@/lib/server/prisma.server', () => ({ prisma: mockPrisma() }));
vi.mock('@/lib/server/logger.server', () => ({ default: mockLogger() }));
vi.mock('@/lib/server/changelogLogger', () => ({ logChangelog: vi.fn() }));
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));

import { prisma } from '@/lib/server/prisma.server';
import logger from '@/lib/server/logger.server';
import { logChangelog } from '@/lib/server/changelogLogger';
import {
  getCountries,
  getCountriesWithCounts,
  getCountryByCountrycode,
  createCountry,
  updateCountry,
  deleteCountry,
} from '../countries.service';

describe('countries.service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getCountries', () => {
    it('returns all countries', async () => {
      const mockData = [{ countrycodePolpal: 'DEU', countryname: 'Germany' }];
      vi.mocked(prisma.countries.findMany).mockResolvedValue(mockData as never);
      const result = await getCountries();
      expect(result).toEqual(mockData);
    });
  });

  describe('getCountriesWithCounts', () => {
    it('returns countries with entity counts', async () => {
      vi.mocked(prisma.countries.findMany).mockResolvedValue([
        { countrycodePolpal: 'DEU', countryname: 'Germany', iso2c: 'DE', region: 'Europe' },
        { countrycodePolpal: 'FRA', countryname: 'France', iso2c: 'FR', region: 'Europe' },
      ] as never);
      vi.mocked(prisma.entitiesInCountries.findMany).mockResolvedValue([
        { countrycodePolpal: 'DEU' },
        { countrycodePolpal: 'DEU' },
        { countrycodePolpal: 'FRA' },
      ] as never);

      const result = await getCountriesWithCounts();
      expect(result).toHaveLength(2);
      expect(result[0].entitiesCount).toBe(2);
      expect(result[1].entitiesCount).toBe(1);
    });

    it('returns zero count for countries without entities', async () => {
      vi.mocked(prisma.countries.findMany).mockResolvedValue([
        { countrycodePolpal: 'XX', countryname: 'Empty', iso2c: null, region: null },
      ] as never);
      vi.mocked(prisma.entitiesInCountries.findMany).mockResolvedValue([] as never);

      const result = await getCountriesWithCounts();
      expect(result[0].entitiesCount).toBe(0);
    });
  });

  describe('getCountryByCountrycode', () => {
    it('returns a country by code', async () => {
      const mockData = { countrycodePolpal: 'DEU', countryname: 'Germany' };
      vi.mocked(prisma.countries.findUnique).mockResolvedValue(mockData as never);
      const result = await getCountryByCountrycode('DEU');
      expect(result).toEqual(mockData);
    });
  });

  describe('createCountry', () => {
    it('creates a country and links world entities', async () => {
      const created = { countryId: 1, countrycodePolpal: 'DEU', countryname: 'Germany', userId: 1 };
      vi.mocked(prisma.countries.create).mockResolvedValue(created as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);
      vi.mocked(prisma.entities.findMany).mockResolvedValue([
        { polpalId: 1 },
        { polpalId: 2 },
      ] as never);
      vi.mocked(prisma.entitiesInCountries.createMany).mockResolvedValue({ count: 2 } as never);

      const result = await createCountry(
        { countrycodePolpal: 'DEU', isCountry: true, countryname: 'Germany' },
        1,
      );
      expect(result).toEqual(created);
      expect(logChangelog).toHaveBeenCalledOnce();
      expect(prisma.entitiesInCountries.createMany).toHaveBeenCalled();
    });
  });

  describe('updateCountry', () => {
    it('updates and logs changed fields', async () => {
      const existing = { countryId: 1, countrycodePolpal: 'DEU', countryname: 'Deutschland', isCountry: true, userId: 1 };
      vi.mocked(prisma.countries.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
        const tx = {
          countries: {
            update: vi.fn().mockResolvedValue({ ...existing, countryname: 'Germany', countrycodePolpal: 'DEU' } as never),
          },
        };
        return (fn as (t: typeof tx) => Promise<unknown>)(tx);
      });
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      const result = await updateCountry(1, 'ADMIN', 'DEU', { countryname: 'Germany' });
      expect(result).toBeDefined();
    });

    it('returns existing when no changes', async () => {
      const existing = { countryId: 1, countrycodePolpal: 'DEU', countryname: 'Germany', isCountry: true, userId: 1 };
      vi.mocked(prisma.countries.findUnique).mockResolvedValue(existing as never);

      const result = await updateCountry(1, 'ADMIN', 'DEU', { countryname: 'Germany' });
      expect(result).toEqual(existing);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws when country not found', async () => {
      vi.mocked(prisma.countries.findUnique).mockResolvedValue(null);
      await expect(updateCountry(1, 'ADMIN', 'XX', { countryname: 'X' })).rejects.toThrow('Country not found');
    });

    it('throws for unauthorized user', async () => {
      const existing = { countryId: 1, countrycodePolpal: 'DEU', countryname: 'Germany', isCountry: true, userId: 99 };
      vi.mocked(prisma.countries.findUnique).mockResolvedValue(existing as never);
      await expect(updateCountry(2, 'USER', 'DEU', { countryname: 'X' })).rejects.toThrow('Unauthorized');
    });
  });

  describe('deleteCountry', () => {
    it('deletes as admin and logs changelog', async () => {
      const existing = { countryId: 1, countrycodePolpal: 'DEU', countryname: 'Germany' };
      vi.mocked(prisma.countries.findUnique).mockResolvedValue(existing as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);
      vi.mocked(prisma.countries.delete).mockResolvedValue(existing as never);

      await deleteCountry('DEU', 1, 'ADMIN');
      expect(prisma.countries.delete).toHaveBeenCalled();
      expect(logChangelog).toHaveBeenCalledOnce();
    });

    it('deletes as datamanager', async () => {
      const existing = { countryId: 1, countrycodePolpal: 'DEU', countryname: 'Germany' };
      vi.mocked(prisma.countries.findUnique).mockResolvedValue(existing as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);
      vi.mocked(prisma.countries.delete).mockResolvedValue(existing as never);

      await deleteCountry('DEU', 1, 'DATAMANAGER');
      expect(prisma.countries.delete).toHaveBeenCalled();
    });

    it('throws when country not found', async () => {
      vi.mocked(prisma.countries.findUnique).mockResolvedValue(null);
      await expect(deleteCountry('XX', 1, 'ADMIN')).rejects.toThrow('Country not found');
    });

    it('throws for unauthorized role', async () => {
      const existing = { countryId: 1, countrycodePolpal: 'DEU', countryname: 'Germany' };
      vi.mocked(prisma.countries.findUnique).mockResolvedValue(existing as never);
      await expect(deleteCountry('DEU', 1, 'USER')).rejects.toThrow('Unauthorized');
    });
  });

  describe('catch-log-rethrow', () => {
    it('getCountries rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.countries.findMany).mockRejectedValue(dbError);

      await expect(getCountries()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getCountriesWithCounts rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.countries.findMany).mockRejectedValue(dbError);

      await expect(getCountriesWithCounts()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getCountryByCountrycode rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.countries.findUnique).mockRejectedValue(dbError);

      await expect(getCountryByCountrycode('DEU')).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('createCountry rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.countries.create).mockRejectedValue(dbError);

      await expect(createCountry(
        { countrycodePolpal: 'DEU', isCountry: true, countryname: 'Germany' },
        1,
      )).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('updateCountry rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.countries.findUnique).mockResolvedValue({
        countryId: 1, countrycodePolpal: 'DEU', countryname: 'Deutschland', isCountry: true, userId: 1,
      } as never);
      vi.mocked(prisma.$transaction).mockRejectedValue(dbError);

      await expect(updateCountry(1, 'ADMIN', 'DEU', { countryname: 'Germany' }))
        .rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteCountry rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.countries.findUnique).mockResolvedValue({
        countryId: 1, countrycodePolpal: 'DEU', countryname: 'Germany',
      } as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);
      vi.mocked(prisma.countries.delete).mockRejectedValue(dbError);

      await expect(deleteCountry('DEU', 1, 'ADMIN')).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
