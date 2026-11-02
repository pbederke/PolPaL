import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockLogger } from '@/__test-utils__/mocks';

vi.mock('@/lib/server/prisma.server', () => ({ prisma: mockPrisma() }));
vi.mock('@/lib/server/logger.server', () => ({ default: mockLogger() }));
vi.mock('@/lib/server/changelogLogger', () => ({ logChangelog: vi.fn() }));

import { prisma } from '@/lib/server/prisma.server';
import logger from '@/lib/server/logger.server';
import { logChangelog } from '@/lib/server/changelogLogger';
import {
  createEntity,
  deleteEntity,
  updateEntity,
  getEntities,
  getEntityByPolpalId,
  getEntitiesWithoutCountry,
  getUpdatePolpalId,
  getHiddenEntities,
  getCommentedEntities,
  getUnassignedEntities,
  getEntitiesWithColors,
  getEntitiesWithWikidataIds,
  getCachedEntityLogo,
  cacheEntityLogo,
  getCachedEntityColor,
  cacheEntityColor,
  getEntityDataset,
} from '../entities.service';
import { RoleEnum } from '@/lib/shared/enums';

describe('entities.service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('createEntity', () => {
    it('creates an entity and logs changelog', async () => {
      const created = { polpalId: 1, nameShort: 'SPD', nameEnglish: 'SPD', entityType: 'PARTY', userId: 1 };
      vi.mocked(prisma.entities.create).mockResolvedValue(created as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      const result = await createEntity({
        nameShort: 'SPD', nameEnglish: 'SPD', entityType: 'PARTY' as never,
      }, 1);
      expect(result).toEqual(created);
      expect(logChangelog).toHaveBeenCalledOnce();
    });
  });

  describe('deleteEntity', () => {
    it('deletes when user is owner (CONTRIBUTOR)', async () => {
      const existing = { polpalId: 1, nameEnglish: 'SPD', userId: 1 };
      vi.mocked(prisma.entities.findUnique).mockResolvedValue(existing as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);
      vi.mocked(prisma.entities.delete).mockResolvedValue(existing as never);

      await deleteEntity(1, 1, RoleEnum.CONTRIBUTOR);
      expect(prisma.entities.delete).toHaveBeenCalled();
    });

    it('deletes when user has ADMIN role', async () => {
      const existing = { polpalId: 1, nameEnglish: 'SPD', userId: 99 };
      vi.mocked(prisma.entities.findUnique).mockResolvedValue(existing as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);
      vi.mocked(prisma.entities.delete).mockResolvedValue(existing as never);

      await deleteEntity(1, 1, RoleEnum.ADMIN);
      expect(prisma.entities.delete).toHaveBeenCalled();
    });

    it('throws when entity not found', async () => {
      vi.mocked(prisma.entities.findUnique).mockResolvedValue(null);
      await expect(deleteEntity(999, 1, RoleEnum.ADMIN)).rejects.toThrow('Entity not found');
    });

    it('throws for CONTRIBUTOR deleting others entity', async () => {
      const existing = { polpalId: 1, nameEnglish: 'SPD', userId: 99 };
      vi.mocked(prisma.entities.findUnique).mockResolvedValue(existing as never);
      await expect(deleteEntity(1, 1, RoleEnum.CONTRIBUTOR)).rejects.toThrow('Forbidden');
    });
  });

  describe('updateEntity', () => {
    it('updates and logs changed fields', async () => {
      const existing = { polpalId: 1, nameShort: 'SPD', nameEnglish: 'SPD Old', isHidden: false, wikidataId: null, entityType: 'PARTY', name: null, partyfactsId: null, wikipediaUrl: null, comment: null, color: null, colorCachedAt: null };
      vi.mocked(prisma.entities.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.linksEntryToEntity.count).mockResolvedValue(0 as never);
      vi.mocked(prisma.entities.update).mockResolvedValue({ ...existing, nameEnglish: 'SPD New' } as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      const result = await updateEntity(1, 1, { nameEnglish: 'SPD New' });
      expect(result).toBeDefined();
      expect(logChangelog).toHaveBeenCalled();
    });

    it('returns existing when no changes', async () => {
      const existing = { polpalId: 1, nameShort: 'SPD', nameEnglish: 'SPD', isHidden: false, wikidataId: null };
      vi.mocked(prisma.entities.findUnique).mockResolvedValue(existing as never);
      const result = await updateEntity(1, 1, { nameEnglish: 'SPD' });
      expect(result).toEqual(existing);
      expect(prisma.entities.update).not.toHaveBeenCalled();
    });

    it('throws when entity not found', async () => {
      vi.mocked(prisma.entities.findUnique).mockResolvedValue(null);
      await expect(updateEntity(1, 999, { nameEnglish: 'X' })).rejects.toThrow('Entity not found');
    });

    it('throws when trying to hide entity with links', async () => {
      const existing = { polpalId: 1, nameShort: 'SPD', nameEnglish: 'SPD', isHidden: false, wikidataId: null };
      vi.mocked(prisma.entities.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.linksEntryToEntity.count).mockResolvedValue(5 as never);

      await expect(updateEntity(1, 1, { isHidden: true })).rejects.toThrow('Cannot hide this entity: it still has 5 dataset links');
    });

    it('allows hiding entity with zero links', async () => {
      const existing = { polpalId: 1, nameShort: 'SPD', nameEnglish: 'SPD', isHidden: false, wikidataId: null };
      vi.mocked(prisma.entities.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.linksEntryToEntity.count).mockResolvedValue(0 as never);
      vi.mocked(prisma.entities.update).mockResolvedValue({ ...existing, isHidden: true } as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      const result = await updateEntity(1, 1, { isHidden: true });
      expect(result).toBeDefined();
    });

    it('invalidates wikidata cache when wikidataId changes', async () => {
      const existing = { polpalId: 1, nameShort: 'SPD', nameEnglish: 'SPD', isHidden: false, wikidataId: 'Q123' };
      vi.mocked(prisma.entities.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.linksEntryToEntity.count).mockResolvedValue(0 as never);
      vi.mocked(prisma.entities.update).mockResolvedValue({ ...existing, wikidataId: 'Q456' } as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      await updateEntity(1, 1, { wikidataId: 'Q456' });
      expect(prisma.entities.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ logoUrl: null, logoUrlCachedAt: null, color: null, colorCachedAt: null }),
        })
      );
    });
  });

  describe('getEntities', () => {
    it('returns filtered entities', async () => {
      vi.mocked(prisma.entities.findMany).mockResolvedValue([] as never);
      const result = await getEntities();
      expect(result).toEqual([]);
      expect(prisma.entities.findMany).toHaveBeenCalled();
    });
  });

  describe('getEntityByPolpalId', () => {
    it('returns null when entity not found', async () => {
      // All 6 parallel queries must resolve
      vi.mocked(prisma.entities.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.entries.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.entries.groupBy).mockResolvedValue([] as never);
      vi.mocked(prisma.variables.findMany).mockResolvedValue([] as never);

      const result = await getEntityByPolpalId(999);
      expect(result.polpalId).toBeUndefined();
    });

    it('returns entity with data when found', async () => {
      vi.mocked(prisma.entities.findUnique).mockResolvedValue({
        polpalId: 1, nameShort: 'SPD', nameEnglish: 'SPD', entityType: 'PARTY',
        isHidden: false, isHiddenReason: null, partyfactsId: null, wikidataId: null,
        wikipediaUrl: null, logoUrl: null, comment: null,
        References: [], EntitiesInCountries: [], GroupingMembers: [],
        GroupingMemberships: [], EntityNames: [], EntityChangeOld: [], EntityChangeNew: [],
      } as never);
      vi.mocked(prisma.entries.findMany)
        .mockResolvedValueOnce([]) // intensity
        .mockResolvedValueOnce([]) // summary
        .mockResolvedValueOnce([]); // idValues
      vi.mocked(prisma.entries.groupBy).mockResolvedValue([] as never);
      vi.mocked(prisma.variables.findMany).mockResolvedValue([] as never);

      const result = await getEntityByPolpalId(1);
      expect(result.polpalId).toBe(1);
    });
  });

  describe('getEntitiesWithoutCountry', () => {
    it('returns entities without country assignments', async () => {
      vi.mocked(prisma.entities.findMany).mockResolvedValue([] as never);
      const result = await getEntitiesWithoutCountry();
      expect(result).toEqual([]);
    });
  });

  describe('getUpdatePolpalId', () => {
    it('returns entity with linkCount', async () => {
      vi.mocked(prisma.entities.findUnique).mockResolvedValue({
        polpalId: 1, nameShort: 'SPD', nameEnglish: 'SPD', entityType: 'PARTY',
        isHidden: false, isHiddenReason: null, name: null,
        wikipediaUrl: null, wikidataId: null, comment: null,
        EntitiesInCountries: [],
        _count: { LinksEntryToEntity: 5 },
      } as never);
      const result = await getUpdatePolpalId(1);
      expect(result.linkCount).toBe(5);
    });

    it('throws when not found', async () => {
      vi.mocked(prisma.entities.findUnique).mockResolvedValue(null);
      await expect(getUpdatePolpalId(999)).rejects.toThrow('Entity not found');
    });
  });

  describe('getHiddenEntities', () => {
    it('returns hidden entities', async () => {
      vi.mocked(prisma.entities.findMany).mockResolvedValue([] as never);
      const result = await getHiddenEntities();
      expect(result).toEqual([]);
    });
  });

  describe('getCommentedEntities', () => {
    it('returns entities with comments', async () => {
      vi.mocked(prisma.entities.findMany).mockResolvedValue([] as never);
      const result = await getCommentedEntities();
      expect(result).toEqual([]);
    });
  });

  describe('getUnassignedEntities', () => {
    it('returns unassigned entities', async () => {
      vi.mocked(prisma.entities.findMany).mockResolvedValue([] as never);
      const result = await getUnassignedEntities();
      expect(result).toEqual([]);
    });
  });

  describe('getEntitiesWithColors', () => {
    it('returns entities with colors', async () => {
      vi.mocked(prisma.entities.findMany).mockResolvedValue([] as never);
      const result = await getEntitiesWithColors();
      expect(result).toEqual([]);
    });
  });

  describe('getEntitiesWithWikidataIds', () => {
    it('returns entities with wikidata ids', async () => {
      vi.mocked(prisma.entities.findMany).mockResolvedValue([] as never);
      const result = await getEntitiesWithWikidataIds();
      expect(result).toEqual([]);
    });
  });

  describe('getCachedEntityLogo', () => {
    it('returns cached logo', async () => {
      vi.mocked(prisma.entities.findFirst).mockResolvedValue({ polpalId: 1, logoUrl: 'http://logo.png', logoUrlCachedAt: new Date(), logoAttribution: 'attr' } as never);
      const result = await getCachedEntityLogo('Q123');
      expect(result).toBeDefined();
    });
  });

  describe('cacheEntityLogo', () => {
    it('updates entity with logo data', async () => {
      vi.mocked(prisma.entities.update).mockResolvedValue({} as never);
      await cacheEntityLogo(1, 'http://logo.png', 'attr');
      expect(prisma.entities.update).toHaveBeenCalled();
    });
  });

  describe('getCachedEntityColor', () => {
    it('returns cached color', async () => {
      vi.mocked(prisma.entities.findFirst).mockResolvedValue({ polpalId: 1, color: '#FF0000', colorCachedAt: new Date() } as never);
      const result = await getCachedEntityColor('Q123');
      expect(result).toBeDefined();
    });
  });

  describe('cacheEntityColor', () => {
    it('updates entity with color', async () => {
      vi.mocked(prisma.entities.update).mockResolvedValue({} as never);
      await cacheEntityColor(1, '#FF0000');
      expect(prisma.entities.update).toHaveBeenCalled();
    });
  });

  describe('getEntityDataset', () => {
    it('returns entity with filtered links for dataset', async () => {
      const entity = {
        polpalId: 1, nameShort: 'SPD', nameEnglish: 'SPD',
        LinksEntryToEntity: [
          { uniqueObservationId: 'obs1', polpalId: 1, Entries: { entryId: 10, datasetKey: 'ds1' } },
        ],
      };
      vi.mocked(prisma.entities.findUnique).mockResolvedValue(entity as never);
      const result = await getEntityDataset(1, 'ds1');
      expect(result).toEqual(entity);
      expect(prisma.entities.findUnique).toHaveBeenCalledWith({
        where: { polpalId: 1 },
        include: {
          LinksEntryToEntity: {
            where: { Entries: { datasetKey: 'ds1' } },
            select: { uniqueObservationId: true, polpalId: true, Entries: true },
          },
        },
      });
    });

    it('returns null when entity not found', async () => {
      vi.mocked(prisma.entities.findUnique).mockResolvedValue(null);
      const result = await getEntityDataset(999, 'ds1');
      expect(result).toBeNull();
    });

    it('returns entity with empty links when no entries match dataset', async () => {
      const entity = {
        polpalId: 1, nameShort: 'SPD', nameEnglish: 'SPD',
        LinksEntryToEntity: [],
      };
      vi.mocked(prisma.entities.findUnique).mockResolvedValue(entity as never);
      const result = await getEntityDataset(1, 'nonexistent');
      expect(result).toEqual(entity);
      expect(result!.LinksEntryToEntity).toEqual([]);
    });
  });

  describe('catch-log-rethrow', () => {
    it('getEntities rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entities.findMany).mockRejectedValue(dbError);

      await expect(getEntities()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('createEntity rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entities.create).mockRejectedValue(dbError);

      await expect(createEntity({
        nameShort: 'SPD', nameEnglish: 'SPD', entityType: 'PARTY' as never,
      }, 1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteEntity rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entities.findUnique).mockResolvedValue({ polpalId: 1, nameEnglish: 'SPD', userId: 1 } as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);
      vi.mocked(prisma.entities.delete).mockRejectedValue(dbError);

      await expect(deleteEntity(1, 1, RoleEnum.ADMIN)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('updateEntity rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entities.findUnique).mockResolvedValue({
        polpalId: 1, nameShort: 'SPD', nameEnglish: 'SPD Old', isHidden: false, wikidataId: null,
        entityType: 'PARTY', name: null, partyfactsId: null, wikipediaUrl: null, comment: null,
      } as never);
      vi.mocked(prisma.entities.update).mockRejectedValue(dbError);

      await expect(updateEntity(1, 1, { nameEnglish: 'SPD New' })).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getEntityByPolpalId rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entities.findUnique).mockRejectedValue(dbError);

      await expect(getEntityByPolpalId(1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getEntityDataset rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entities.findUnique).mockRejectedValue(dbError);

      await expect(getEntityDataset(1, 'ds1')).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getEntitiesWithoutCountry rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entities.findMany).mockRejectedValue(dbError);

      await expect(getEntitiesWithoutCountry()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getUpdatePolpalId rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entities.findUnique).mockRejectedValue(dbError);

      await expect(getUpdatePolpalId(1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getHiddenEntities rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entities.findMany).mockRejectedValue(dbError);

      await expect(getHiddenEntities()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getCommentedEntities rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entities.findMany).mockRejectedValue(dbError);

      await expect(getCommentedEntities()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getUnassignedEntities rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entities.findMany).mockRejectedValue(dbError);

      await expect(getUnassignedEntities()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getEntitiesWithColors rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entities.findMany).mockRejectedValue(dbError);

      await expect(getEntitiesWithColors()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getEntitiesWithWikidataIds rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entities.findMany).mockRejectedValue(dbError);

      await expect(getEntitiesWithWikidataIds()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getCachedEntityLogo rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entities.findFirst).mockRejectedValue(dbError);

      await expect(getCachedEntityLogo('Q123')).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('cacheEntityLogo rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entities.update).mockRejectedValue(dbError);

      await expect(cacheEntityLogo(1, 'http://logo.png', 'attr')).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getCachedEntityColor rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entities.findFirst).mockRejectedValue(dbError);

      await expect(getCachedEntityColor('Q123')).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('cacheEntityColor rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entities.update).mockRejectedValue(dbError);

      await expect(cacheEntityColor(1, '#FF0000')).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
