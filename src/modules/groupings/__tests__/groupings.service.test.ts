import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockLogger } from '@/__test-utils__/mocks';

vi.mock('@/lib/server/prisma.server', () => ({ prisma: mockPrisma() }));
vi.mock('@/lib/server/logger.server', () => ({ default: mockLogger() }));
vi.mock('@/lib/server/changelogLogger', () => ({ logChangelog: vi.fn() }));

import { prisma } from '@/lib/server/prisma.server';
import logger from '@/lib/server/logger.server';
import { logChangelog } from '@/lib/server/changelogLogger';
import {
  getGroupingMembershipByPolpalId,
  getGroupingMembersByGroupingId,
  createGroupingMember,
  updateGroupingMember,
  deleteGroupingMember,
} from '../groupings.service';

describe('groupings.service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getGroupingMembershipByPolpalId', () => {
    it('returns memberships for an entity', async () => {
      vi.mocked(prisma.groupingMembers.findMany).mockResolvedValue([] as never);
      const result = await getGroupingMembershipByPolpalId(100);
      expect(prisma.groupingMembers.findMany).toHaveBeenCalledWith({
        where: { entityId: 100, Entities: { isHidden: false }, Groupings: { isHidden: false } },
        select: {
          groupingMemberId: true,
          entityId: true,
          groupingId: true,
          startYear: true,
          startMonth: true,
          startDay: true,
          endYear: true,
          endMonth: true,
          endDay: true,
          comment: true,
          Entities: { select: { polpalId: true, nameShort: true, nameEnglish: true, entityType: true } },
          Groupings: { select: { polpalId: true, nameShort: true, nameEnglish: true, entityType: true } },
        },
      });
      expect(result).toEqual([]);
    });
  });

  describe('getGroupingMembersByGroupingId', () => {
    it('returns members for a grouping', async () => {
      vi.mocked(prisma.groupingMembers.findMany).mockResolvedValue([] as never);
      await getGroupingMembersByGroupingId(200);
      expect(prisma.groupingMembers.findMany).toHaveBeenCalledWith({
        where: { groupingId: 200, Entities: { isHidden: false }, Groupings: { isHidden: false } },
        select: {
          groupingMemberId: true,
          entityId: true,
          groupingId: true,
          startYear: true,
          startMonth: true,
          startDay: true,
          endYear: true,
          endMonth: true,
          endDay: true,
          comment: true,
          Entities: { select: { polpalId: true, nameShort: true, nameEnglish: true, entityType: true } },
          Groupings: { select: { polpalId: true, nameShort: true, nameEnglish: true, entityType: true } },
        },
      });
    });
  });

  describe('createGroupingMember', () => {
    it('creates after validating entity and grouping', async () => {
      const entity = { polpalId: 100, nameEnglish: 'SPD', entityType: 'PARTY' };
      const grouping = { polpalId: 200, nameEnglish: 'EU', entityType: 'GROUPING' };
      const created = { groupingMemberId: 1, entityId: 100, groupingId: 200, startYear: 2000, userId: 1 };

      vi.mocked(prisma.entities.findUnique)
        .mockResolvedValueOnce(entity as never)
        .mockResolvedValueOnce(grouping as never);
      vi.mocked(prisma.groupingMembers.create).mockResolvedValue(created as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      const result = await createGroupingMember(1, {
        entityId: 100, groupingId: 200, startYear: 2000,
      });
      expect(result).toEqual(created);
      expect(logChangelog).toHaveBeenCalledOnce();
    });

    it('throws when entity not found', async () => {
      vi.mocked(prisma.entities.findUnique).mockResolvedValue(null);
      await expect(createGroupingMember(1, {
        entityId: 999, groupingId: 200, startYear: 2000,
      })).rejects.toThrow('Invalid entity ID or not of type PARTY');
    });

    it('throws when grouping not found', async () => {
      vi.mocked(prisma.entities.findUnique)
        .mockResolvedValueOnce({ polpalId: 100, nameEnglish: 'SPD', entityType: 'PARTY' } as never)
        .mockResolvedValueOnce(null);
      await expect(createGroupingMember(1, {
        entityId: 100, groupingId: 999, startYear: 2000,
      })).rejects.toThrow('Invalid grouping ID or not of type GROUPING');
    });

    it('throws when grouping is not GROUPING type', async () => {
      vi.mocked(prisma.entities.findUnique)
        .mockResolvedValueOnce({ polpalId: 100, nameEnglish: 'SPD', entityType: 'PARTY' } as never)
        .mockResolvedValueOnce({ polpalId: 200, nameEnglish: 'Other', entityType: 'PARTY' } as never);
      await expect(createGroupingMember(1, {
        entityId: 100, groupingId: 200, startYear: 2000,
      })).rejects.toThrow('Invalid grouping ID or not of type GROUPING');
    });
  });

  describe('updateGroupingMember', () => {
    it('updates the dates and logs changelog', async () => {
      const existing = { groupingMemberId: 1, entityId: 100, groupingId: 200, startYear: 2000, startMonth: null, startDay: null, endYear: 2005, endMonth: null, endDay: null, comment: null, userId: 1 };
      const updated = { ...existing, startYear: 2001, endYear: 2006 };

      vi.mocked(prisma.groupingMembers.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.groupingMembers.update).mockResolvedValue(updated as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      const result = await updateGroupingMember(1, 1, {
        startYear: 2001, startMonth: null, startDay: null,
        endYear: 2006, endMonth: null, endDay: null,
      });

      expect(result).toEqual(updated);
      expect(prisma.groupingMembers.update).toHaveBeenCalledWith({
        where: { groupingMemberId: 1 },
        data: {
          startYear: 2001, startMonth: null, startDay: null,
          endYear: 2006, endMonth: null, endDay: null,
        },
      });
      expect(logChangelog).toHaveBeenCalledTimes(2);
    });

    it('updates the comment and logs changelog', async () => {
      const existing = { groupingMemberId: 1, entityId: 100, groupingId: 200, startYear: 2000, startMonth: null, startDay: null, endYear: 2005, endMonth: null, endDay: null, comment: 'Old', userId: 1 };
      const updated = { ...existing, comment: 'New' };

      vi.mocked(prisma.groupingMembers.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.groupingMembers.update).mockResolvedValue(updated as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      await updateGroupingMember(1, 1, { comment: 'New' });

      expect(prisma.groupingMembers.update).toHaveBeenCalledWith({
        where: { groupingMemberId: 1 },
        data: { comment: 'New' },
      });
      expect(logChangelog).toHaveBeenCalledOnce();
      expect(logChangelog).toHaveBeenCalledWith(expect.objectContaining({ field: 'comment', oldValue: 'Old', newValue: 'New' }));
    });

    it('only sends provided fields to the database', async () => {
      const existing = { groupingMemberId: 1, entityId: 100, groupingId: 200, startYear: 2000, startMonth: null, startDay: null, endYear: null, endMonth: null, endDay: null, comment: null, userId: 1 };

      vi.mocked(prisma.groupingMembers.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.groupingMembers.update).mockResolvedValue(existing as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      await updateGroupingMember(1, 1, { endYear: 2010, endMonth: 5, endDay: 1 });

      expect(prisma.groupingMembers.update).toHaveBeenCalledWith({
        where: { groupingMemberId: 1 },
        data: { endYear: 2010, endMonth: 5, endDay: 1 },
      });
    });

    it('throws when grouping member not found', async () => {
      vi.mocked(prisma.groupingMembers.findUnique).mockResolvedValue(null);
      await expect(updateGroupingMember(999, 1, { startYear: 2001, endYear: 2006 }))
        .rejects.toThrow('Grouping member not found');
    });
  });

  describe('deleteGroupingMember', () => {
    it('deletes and logs changelog', async () => {
      const existing = { groupingMemberId: 1, entityId: 100, groupingId: 200 };
      vi.mocked(prisma.groupingMembers.findUnique).mockResolvedValue(existing as never);
      vi.mocked(prisma.entities.findUnique)
        .mockResolvedValueOnce({ polpalId: 100, nameEnglish: 'SPD' } as never)
        .mockResolvedValueOnce({ polpalId: 200, nameEnglish: 'EU' } as never);
      vi.mocked(prisma.groupingMembers.delete).mockResolvedValue(existing as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);

      await deleteGroupingMember(1, 1, 'test');
      expect(prisma.groupingMembers.delete).toHaveBeenCalled();
      expect(logChangelog).toHaveBeenCalledOnce();
    });

    it('throws when not found', async () => {
      vi.mocked(prisma.groupingMembers.findUnique).mockResolvedValue(null);
      await expect(deleteGroupingMember(999, 1)).rejects.toThrow('Grouping member not found');
    });
  });

  describe('catch-log-rethrow', () => {
    it('getGroupingMembershipByPolpalId rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.groupingMembers.findMany).mockRejectedValue(dbError);

      await expect(getGroupingMembershipByPolpalId(100)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getGroupingMembersByGroupingId rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.groupingMembers.findMany).mockRejectedValue(dbError);

      await expect(getGroupingMembersByGroupingId(200)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('createGroupingMember rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entities.findUnique)
        .mockResolvedValueOnce({ polpalId: 100, nameEnglish: 'SPD', entityType: 'PARTY' } as never)
        .mockResolvedValueOnce({ polpalId: 200, nameEnglish: 'EU', entityType: 'GROUPING' } as never);
      vi.mocked(prisma.groupingMembers.create).mockRejectedValue(dbError);

      await expect(createGroupingMember(1, { entityId: 100, groupingId: 200, startYear: 2000 }))
        .rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('updateGroupingMember rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.groupingMembers.findUnique).mockResolvedValue({
        groupingMemberId: 1, entityId: 100, groupingId: 200, startYear: 2000,
        startMonth: null, startDay: null, endYear: 2005, endMonth: null, endDay: null, comment: null, userId: 1,
      } as never);
      vi.mocked(prisma.groupingMembers.update).mockRejectedValue(dbError);

      await expect(updateGroupingMember(1, 1, { startYear: 2001 }))
        .rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteGroupingMember rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.groupingMembers.findUnique).mockResolvedValue({
        groupingMemberId: 1, entityId: 100, groupingId: 200,
      } as never);
      vi.mocked(prisma.entities.findUnique)
        .mockResolvedValueOnce({ polpalId: 100, nameEnglish: 'SPD' } as never)
        .mockResolvedValueOnce({ polpalId: 200, nameEnglish: 'EU' } as never);
      vi.mocked(prisma.groupingMembers.delete).mockRejectedValue(dbError);

      await expect(deleteGroupingMember(1, 1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
