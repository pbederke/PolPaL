import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, mockLogger } from '@/__test-utils__/mocks';

vi.mock('@/lib/server/prisma.server', () => ({ prisma: mockPrisma() }));
vi.mock('@/lib/server/logger.server', () => ({ default: mockLogger() }));
vi.mock('@/lib/server/changelogLogger', () => ({ logChangelog: vi.fn() }));
vi.mock('bcrypt', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed-password' as never) },
}));

import { prisma } from '@/lib/server/prisma.server';
import logger from '@/lib/server/logger.server';
import { logChangelog } from '@/lib/server/changelogLogger';
import {
  createUserAdmin,
  updateUserAdmin,
  deleteUserAdmin,
  getUsersAdmin,
  getEntitiesAdmin,
  getChangelogTableNames,
  getChangelogByTable,
  getUserActivityOverview,
  getProjectsAdmin,
  deleteProjectAdmin,
  getDatasetsAdmin,
  deleteDatasetAdmin,
  getVersionsAdmin,
  deleteVersionAdmin,
  getEntityNamesAdmin,
  deleteEntityNameAdmin,
  getEntityChangesAdmin,
  deleteEntityChangeAdmin,
  getEntitiesInCountriesAdmin,
  deleteEntityInCountriesAdmin,
  getGroupingMembersAdmin,
  deleteGroupingMemberAdmin,
  getEntriesAdmin,
  deleteEntryAdmin,
  getLinkEntriesEntitiesAdmin,
  deleteLinkEntryEntityAdmin,
  getValidationLinksAdmin,
  deleteValidationLinkAdmin,
  getAboutAdmin,
  deleteAboutAdmin,
  getReportTicketsAdmin,
  deleteReportTicketAdmin,
  getApproveUserAdmin,
  updateApproveUserAdmin,
  deleteApproveUserAdmin,
  getUserForApprovalDeletion,
  getApproveUserCountAdmin,
  getReferencesAdmin,
  deleteReferenceAdmin,
  getNewsAdmin,
  getCountriesAdmin,
} from '../admin.service';


describe('admin.service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('createUserAdmin', () => {
    it('creates a user with hashed password', async () => {
      vi.mocked(prisma.users.findFirst).mockResolvedValue(null);
      const created = { userId: 1, username: 'newuser', nameFirst: 'New', nameLast: 'User', email: 'new@test.com', role: 'USER', approvedByAdmin: false, emailVerified: false, createdAt: new Date(), updatedAt: new Date() };
      vi.mocked(prisma.users.create).mockResolvedValue(created as never);

      const result = await createUserAdmin({
        username: 'newuser', nameFirst: 'New', nameLast: 'User', email: 'new@test.com',
        password: 'pass', role: 'USER' as never, approvedByAdmin: false, emailVerified: false,
      });
      expect(result.username).toBe('newuser');
    });

    it('throws on username conflict', async () => {
      vi.mocked(prisma.users.findFirst).mockResolvedValue({ username: 'taken', email: 'x@x.com' } as never);
      await expect(createUserAdmin({
        username: 'taken', nameFirst: 'X', nameLast: 'X', email: 'x@x.com',
        password: 'pass', role: 'USER' as never, approvedByAdmin: false, emailVerified: false,
      })).rejects.toThrow('Username is already taken');
    });

    it('throws on email conflict', async () => {
      vi.mocked(prisma.users.findFirst).mockResolvedValue({ username: 'other', email: 'taken@test.com' } as never);
      await expect(createUserAdmin({
        username: 'new', nameFirst: 'X', nameLast: 'X', email: 'taken@test.com',
        password: 'pass', role: 'USER' as never, approvedByAdmin: false, emailVerified: false,
      })).rejects.toThrow('Email is already in use');
    });
  });

  describe('updateUserAdmin', () => {
    it('updates user and increments tokenVersion', async () => {
      vi.mocked(prisma.users.findFirst).mockResolvedValue(null);
      const updated = { userId: 1, username: 'u', nameFirst: 'N', nameLast: 'L', email: 'e@e.com', role: 'ADMIN', approvedByAdmin: true, emailVerified: true, createdAt: new Date(), updatedAt: new Date() };
      vi.mocked(prisma.users.update).mockResolvedValue(updated as never);

      const result = await updateUserAdmin(1, {
        username: 'u', nameFirst: 'N', nameLast: 'L', email: 'e@e.com',
        role: 'ADMIN' as never, approvedByAdmin: true, emailVerified: true,
      });
      expect(result).toEqual(updated);
    });

    it('throws on username conflict', async () => {
      vi.mocked(prisma.users.findFirst).mockResolvedValueOnce({ userId: 2 });
      await expect(updateUserAdmin(1, {
        username: 'taken', nameFirst: 'N', nameLast: 'L', email: 'e@e.com',
        role: 'USER' as never, approvedByAdmin: true, emailVerified: true,
      })).rejects.toThrow('Username is already taken');
    });

    it('throws on email conflict', async () => {
      vi.mocked(prisma.users.findFirst)
        .mockResolvedValueOnce(null) // username check
        .mockResolvedValueOnce({ userId: 2 }); // email check
      await expect(updateUserAdmin(1, {
        username: 'u', nameFirst: 'N', nameLast: 'L', email: 'taken@test.com',
        role: 'USER' as never, approvedByAdmin: true, emailVerified: true,
      })).rejects.toThrow('Email is already in use');
    });
  });

  describe('deleteUserAdmin', () => {
    it('deletes user', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue({ userId: 1 } as never);
      vi.mocked(prisma.users.delete).mockResolvedValue({} as never);
      await deleteUserAdmin(1);
      expect(prisma.users.delete).toHaveBeenCalled();
    });

    it('throws when user not found', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue(null);
      await expect(deleteUserAdmin(999)).rejects.toThrow('User not found');
    });
  });

  describe('getUsersAdmin', () => {
    it('returns paginated users with count', async () => {
      vi.mocked(prisma.users.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.users.count).mockResolvedValue(0 as never);
      const result = await getUsersAdmin();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getEntitiesAdmin', () => {
    it('returns paginated entities with count', async () => {
      vi.mocked(prisma.entities.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.entities.count).mockResolvedValue(0 as never);
      const result = await getEntitiesAdmin();
      expect(result.items).toEqual([]);
    });
  });

  describe('getCountriesAdmin', () => {
    it('returns paginated countries', async () => {
      vi.mocked(prisma.countries.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.countries.count).mockResolvedValue(0 as never);
      const result = await getCountriesAdmin();
      expect(result.items).toEqual([]);
    });
  });

  describe('getNewsAdmin', () => {
    it('returns paginated news', async () => {
      vi.mocked(prisma.news.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.news.count).mockResolvedValue(0 as never);
      const result = await getNewsAdmin();
      expect(result.items).toEqual([]);
    });
  });

  describe('getChangelogTableNames', () => {
    it('returns distinct table names', async () => {
      vi.mocked(prisma.changelog.findMany).mockResolvedValue([
        { tableName: 'entities' }, { tableName: 'news' },
      ] as never);
      const result = await getChangelogTableNames('CREATED' as never);
      expect(result).toEqual(['entities', 'news']);
    });
  });

  describe('getChangelogByTable', () => {
    it('returns logs and count', async () => {
      vi.mocked(prisma.changelog.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.changelog.count).mockResolvedValue(0 as never);
      const result = await getChangelogByTable('CREATED' as never, 'entities' as never);
      expect(result.logs).toEqual([]);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('getUserActivityOverview', () => {
    it('returns empty overview when no activity', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([] as never);
      vi.mocked(prisma.users.findMany).mockResolvedValue([] as never);
      const result = await getUserActivityOverview();
      expect(result.users).toEqual([]);
      expect(result.grandTotal).toBe(0);
    });

    it('returns user activity with correct counts and grandTotal', async () => {
      const rawRows = [
        { userId: 1, tableName: 'entities', action: 'CREATED', count: 5n },
        { userId: 1, tableName: 'entities', action: 'UPDATED', count: 3n },
        { userId: 2, tableName: 'entities', action: 'CREATED', count: 2n },
      ];
      vi.mocked(prisma.$queryRaw).mockResolvedValue(rawRows as never);
      vi.mocked(prisma.users.findMany).mockResolvedValue([
        { userId: 1, nameFirst: 'Alice', nameLast: 'Smith', username: 'alice', email: 'alice@test.com' },
        { userId: 2, nameFirst: 'Bob', nameLast: 'Jones', username: 'bob', email: 'bob@test.com' },
      ] as never);

      const result = await getUserActivityOverview();
      expect(result.users).toHaveLength(2);
      expect(result.users[0].userId).toBe(1);
      expect(result.users[0].name).toBe('Alice Smith');
      expect(result.users[0].counts.entitiesCreated).toBe(5);
      expect(result.users[0].counts.entitiesUpdated).toBe(3);
      expect(result.users[0].total).toBe(8);
      expect(result.users[1].userId).toBe(2);
      expect(result.users[1].total).toBe(2);
      expect(result.grandTotal).toBe(10);
      expect(result.totals.entitiesCreated).toBe(7);
      expect(result.totals.entitiesUpdated).toBe(3);
    });
  });

  describe('getProjectsAdmin', () => {
    it('returns paginated projects', async () => {
      vi.mocked(prisma.projects.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.projects.count).mockResolvedValue(0 as never);
      const result = await getProjectsAdmin();
      expect(result.items).toEqual([]);
    });
  });

  describe('deleteProjectAdmin', () => {
    it('deletes and logs changelog', async () => {
      vi.mocked(prisma.projects.findUnique).mockResolvedValue({ projectId: 1, projectKey: 'p1' } as never);
      vi.mocked(prisma.projects.delete).mockResolvedValue({} as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);
      await deleteProjectAdmin('p1', 1);
      expect(logChangelog).toHaveBeenCalled();
    });

    it('throws when not found', async () => {
      vi.mocked(prisma.projects.findUnique).mockResolvedValue(null);
      await expect(deleteProjectAdmin('xx', 1)).rejects.toThrow('Not found');
    });
  });

  describe('getDatasetsAdmin', () => {
    it('returns paginated datasets', async () => {
      vi.mocked(prisma.datasets.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.datasets.count).mockResolvedValue(0 as never);
      const result = await getDatasetsAdmin();
      expect(result.items).toEqual([]);
    });
  });

  describe('deleteDatasetAdmin', () => {
    it('deletes and logs changelog', async () => {
      vi.mocked(prisma.datasets.findUnique).mockResolvedValue({ datasetId: 1, datasetKey: 'ds1' } as never);
      vi.mocked(prisma.datasets.delete).mockResolvedValue({} as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);
      await deleteDatasetAdmin('ds1', 1);
      expect(logChangelog).toHaveBeenCalled();
    });

    it('throws when not found', async () => {
      vi.mocked(prisma.datasets.findUnique).mockResolvedValue(null);
      await expect(deleteDatasetAdmin('xx', 1)).rejects.toThrow('Not found');
    });
  });

  describe('getVersionsAdmin', () => {
    it('returns paginated versions', async () => {
      vi.mocked(prisma.versions.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.versions.count).mockResolvedValue(0 as never);
      const result = await getVersionsAdmin();
      expect(result.items).toEqual([]);
    });
  });

  describe('deleteVersionAdmin', () => {
    it('deletes and logs changelog', async () => {
      vi.mocked(prisma.versions.findUnique).mockResolvedValue({ versionId: 1, versionKey: 'v1' } as never);
      vi.mocked(prisma.versions.delete).mockResolvedValue({} as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);
      await deleteVersionAdmin('v1', 1);
      expect(logChangelog).toHaveBeenCalled();
    });

    it('throws when not found', async () => {
      vi.mocked(prisma.versions.findUnique).mockResolvedValue(null);
      await expect(deleteVersionAdmin('xx', 1)).rejects.toThrow('Not found');
    });
  });

  describe('getEntityNamesAdmin', () => {
    it('returns paginated entity names', async () => {
      vi.mocked(prisma.entityNames.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.entityNames.count).mockResolvedValue(0 as never);
      const result = await getEntityNamesAdmin();
      expect(result.items).toEqual([]);
    });
  });

  describe('deleteEntityNameAdmin', () => {
    it('deletes and logs changelog', async () => {
      vi.mocked(prisma.entityNames.findUnique).mockResolvedValue({ entityNameId: 1, polpalId: 100, name: 'SPD' } as never);
      vi.mocked(prisma.entityNames.delete).mockResolvedValue({} as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);
      await deleteEntityNameAdmin(1, 1);
      expect(logChangelog).toHaveBeenCalled();
    });

    it('throws when not found', async () => {
      vi.mocked(prisma.entityNames.findUnique).mockResolvedValue(null);
      await expect(deleteEntityNameAdmin(999, 1)).rejects.toThrow('Not found');
    });
  });

  describe('getEntityChangesAdmin', () => {
    it('returns paginated entity changes', async () => {
      vi.mocked(prisma.entityChanges.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.entityChanges.count).mockResolvedValue(0 as never);
      const result = await getEntityChangesAdmin();
      expect(result.items).toEqual([]);
    });
  });

  describe('deleteEntityChangeAdmin', () => {
    it('deletes and logs changelog with entity names', async () => {
      vi.mocked(prisma.entityChanges.findUnique).mockResolvedValue({ entityChangeId: 1, polpalIdOld: 10, polpalIdNew: 20 } as never);
      vi.mocked(prisma.entities.findUnique)
        .mockResolvedValueOnce({ polpalId: 10, nameEnglish: 'Old' })
        .mockResolvedValueOnce({ polpalId: 20, nameEnglish: 'New' });
      vi.mocked(prisma.entityChanges.delete).mockResolvedValue({} as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);
      await deleteEntityChangeAdmin(1, 1);
      expect(logChangelog).toHaveBeenCalled();
    });

    it('throws when not found', async () => {
      vi.mocked(prisma.entityChanges.findUnique).mockResolvedValue(null);
      await expect(deleteEntityChangeAdmin(999, 1)).rejects.toThrow('Not found');
    });
  });

  describe('getEntitiesInCountriesAdmin', () => {
    it('returns paginated data', async () => {
      vi.mocked(prisma.entitiesInCountries.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.entitiesInCountries.count).mockResolvedValue(0 as never);
      const result = await getEntitiesInCountriesAdmin();
      expect(result.items).toEqual([]);
    });
  });

  describe('deleteEntityInCountriesAdmin', () => {
    it('deletes and logs changelog', async () => {
      vi.mocked(prisma.entitiesInCountries.findUnique).mockResolvedValue({ entityInCountryId: 1, polpalId: 100, countrycodePolpal: 'DE' } as never);
      vi.mocked(prisma.entitiesInCountries.delete).mockResolvedValue({} as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);
      await deleteEntityInCountriesAdmin(1, 1);
      expect(logChangelog).toHaveBeenCalled();
    });

    it('throws when not found', async () => {
      vi.mocked(prisma.entitiesInCountries.findUnique).mockResolvedValue(null);
      await expect(deleteEntityInCountriesAdmin(999, 1)).rejects.toThrow('Not found');
    });
  });

  describe('getGroupingMembersAdmin', () => {
    it('returns paginated grouping members', async () => {
      vi.mocked(prisma.groupingMembers.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.groupingMembers.count).mockResolvedValue(0 as never);
      const result = await getGroupingMembersAdmin();
      expect(result.items).toEqual([]);
    });
  });

  describe('deleteGroupingMemberAdmin', () => {
    it('deletes and logs changelog with entity names', async () => {
      vi.mocked(prisma.groupingMembers.findUnique).mockResolvedValue({ groupingMemberId: 1, entityId: 100, groupingId: 200 } as never);
      vi.mocked(prisma.entities.findUnique)
        .mockResolvedValueOnce({ polpalId: 100, nameEnglish: 'Party' })
        .mockResolvedValueOnce({ polpalId: 200, nameEnglish: 'Group' });
      vi.mocked(prisma.groupingMembers.delete).mockResolvedValue({} as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);
      await deleteGroupingMemberAdmin(1, 1);
      expect(logChangelog).toHaveBeenCalled();
    });

    it('throws when not found', async () => {
      vi.mocked(prisma.groupingMembers.findUnique).mockResolvedValue(null);
      await expect(deleteGroupingMemberAdmin(999, 1)).rejects.toThrow('Not found');
    });
  });

  describe('getEntriesAdmin', () => {
    it('returns paginated entries', async () => {
      vi.mocked(prisma.entries.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.entries.count).mockResolvedValue(0 as never);
      const result = await getEntriesAdmin();
      expect(result.items).toEqual([]);
    });
  });

  describe('deleteEntryAdmin', () => {
    it('deletes an entry', async () => {
      vi.mocked(prisma.entries.findUnique).mockResolvedValue({ entryId: 1 } as never);
      vi.mocked(prisma.entries.delete).mockResolvedValue({} as never);
      await deleteEntryAdmin(1);
      expect(prisma.entries.delete).toHaveBeenCalled();
    });

    it('throws when not found', async () => {
      vi.mocked(prisma.entries.findUnique).mockResolvedValue(null);
      await expect(deleteEntryAdmin(999)).rejects.toThrow('Not found');
    });
  });

  describe('getLinkEntriesEntitiesAdmin', () => {
    it('returns paginated links', async () => {
      vi.mocked(prisma.linksEntryToEntity.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.linksEntryToEntity.count).mockResolvedValue(0 as never);
      const result = await getLinkEntriesEntitiesAdmin();
      expect(result.items).toEqual([]);
    });
  });

  describe('deleteLinkEntryEntityAdmin', () => {
    it('deletes and logs changelog', async () => {
      vi.mocked(prisma.linksEntryToEntity.findUnique).mockResolvedValue({ linkEntriesToEntityId: 1, uniqueObservationId: 'obs1' } as never);
      vi.mocked(prisma.linksEntryToEntity.delete).mockResolvedValue({} as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);
      await deleteLinkEntryEntityAdmin(1, 1);
      expect(logChangelog).toHaveBeenCalled();
    });

    it('throws when not found', async () => {
      vi.mocked(prisma.linksEntryToEntity.findUnique).mockResolvedValue(null);
      await expect(deleteLinkEntryEntityAdmin(999, 1)).rejects.toThrow('Not found');
    });
  });

  describe('getValidationLinksAdmin', () => {
    it('returns paginated validation links', async () => {
      vi.mocked(prisma.validationLinks.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.validationLinks.count).mockResolvedValue(0 as never);
      const result = await getValidationLinksAdmin();
      expect(result.items).toEqual([]);
    });
  });

  describe('deleteValidationLinkAdmin', () => {
    it('deletes a validation link', async () => {
      vi.mocked(prisma.validationLinks.findUnique).mockResolvedValue({ validationId: 1 } as never);
      vi.mocked(prisma.validationLinks.delete).mockResolvedValue({} as never);
      await deleteValidationLinkAdmin(1);
      expect(prisma.validationLinks.delete).toHaveBeenCalled();
    });

    it('throws when not found', async () => {
      vi.mocked(prisma.validationLinks.findUnique).mockResolvedValue(null);
      await expect(deleteValidationLinkAdmin(999)).rejects.toThrow('Not found');
    });
  });

  describe('getAboutAdmin', () => {
    it('returns paginated about entries', async () => {
      vi.mocked(prisma.about.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.about.count).mockResolvedValue(0 as never);
      const result = await getAboutAdmin();
      expect(result.items).toEqual([]);
    });
  });

  describe('deleteAboutAdmin', () => {
    it('deletes an about entry', async () => {
      vi.mocked(prisma.about.findUnique).mockResolvedValue({ id: 1 } as never);
      vi.mocked(prisma.about.delete).mockResolvedValue({} as never);
      await deleteAboutAdmin(1);
      expect(prisma.about.delete).toHaveBeenCalled();
    });

    it('throws when not found', async () => {
      vi.mocked(prisma.about.findUnique).mockResolvedValue(null);
      await expect(deleteAboutAdmin(999)).rejects.toThrow('Not found');
    });
  });

  describe('getReportTicketsAdmin', () => {
    it('returns paginated report tickets', async () => {
      vi.mocked(prisma.reportTicket.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.reportTicket.count).mockResolvedValue(0 as never);
      const result = await getReportTicketsAdmin();
      expect(result.items).toEqual([]);
    });
  });

  describe('deleteReportTicketAdmin', () => {
    it('deletes a report ticket', async () => {
      vi.mocked(prisma.reportTicket.findUnique).mockResolvedValue({ id: 1 } as never);
      vi.mocked(prisma.reportTicket.delete).mockResolvedValue({} as never);
      await deleteReportTicketAdmin(1);
      expect(prisma.reportTicket.delete).toHaveBeenCalled();
    });

    it('throws when not found', async () => {
      vi.mocked(prisma.reportTicket.findUnique).mockResolvedValue(null);
      await expect(deleteReportTicketAdmin(999)).rejects.toThrow('Not found');
    });
  });

  describe('getApproveUserAdmin', () => {
    it('returns users pending approval', async () => {
      vi.mocked(prisma.users.findMany).mockResolvedValue([] as never);
      const result = await getApproveUserAdmin();
      expect(result).toEqual([]);
    });
  });

  describe('updateApproveUserAdmin', () => {
    it('updates approval and increments tokenVersion', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue({ userId: 1 } as never);
      vi.mocked(prisma.users.update).mockResolvedValue({ userId: 1, approvedByAdmin: true } as never);
      const result = await updateApproveUserAdmin(1, { approvedByAdmin: true, role: 'USER' as never });
      expect(result).toBeDefined();
    });

    it('throws when user not found', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue(null);
      await expect(updateApproveUserAdmin(999, { approvedByAdmin: true })).rejects.toThrow('User (to approve) not found');
    });
  });

  describe('deleteApproveUserAdmin', () => {
    it('deletes pending user', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue({ userId: 1 } as never);
      vi.mocked(prisma.users.delete).mockResolvedValue({} as never);
      await deleteApproveUserAdmin(1);
      expect(prisma.users.delete).toHaveBeenCalled();
    });

    it('throws when user not found', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue(null);
      await expect(deleteApproveUserAdmin(999)).rejects.toThrow('User (to approve) not found');
    });
  });

  describe('getApproveUserCountAdmin', () => {
    it('returns count of users pending approval', async () => {
      vi.mocked(prisma.users.count).mockResolvedValue(3 as never);
      const result = await getApproveUserCountAdmin();
      expect(result.count).toBe(3);
    });
  });

  describe('getReferencesAdmin', () => {
    it('returns references', async () => {
      vi.mocked(prisma.references.findMany).mockResolvedValue([] as never);
      const result = await getReferencesAdmin();
      expect(result).toEqual([]);
    });
  });

  describe('deleteReferenceAdmin', () => {
    it('deletes and logs changelog', async () => {
      vi.mocked(prisma.references.findUnique).mockResolvedValue({ referenceId: 1, value: 'ref' } as never);
      vi.mocked(prisma.references.delete).mockResolvedValue({} as never);
      vi.mocked(logChangelog).mockResolvedValue(undefined as never);
      await deleteReferenceAdmin(1, 1);
      expect(logChangelog).toHaveBeenCalled();
    });

    it('throws when not found', async () => {
      vi.mocked(prisma.references.findUnique).mockResolvedValue(null);
      await expect(deleteReferenceAdmin(999, 1)).rejects.toThrow('Reference not found');
    });
  });

  describe('getUserForApprovalDeletion', () => {
    it('returns user email and username', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue({ email: 'test@test.com', username: 'testuser' } as never);
      const result = await getUserForApprovalDeletion(1);
      expect(result).toEqual({ email: 'test@test.com', username: 'testuser' });
    });

    it('returns null when user not found', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue(null);
      const result = await getUserForApprovalDeletion(999);
      expect(result).toBeNull();
    });
  });

  describe('catch-log-rethrow', () => {
    it('createUserAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.users.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.users.create).mockRejectedValue(dbError);

      await expect(createUserAdmin({
        username: 'newuser', nameFirst: 'New', nameLast: 'User', email: 'new@test.com',
        password: 'pass', role: 'USER' as never, approvedByAdmin: false, emailVerified: false,
      })).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getEntitiesAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entities.findMany).mockRejectedValue(dbError);

      await expect(getEntitiesAdmin()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getCountriesAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.countries.findMany).mockRejectedValue(dbError);

      await expect(getCountriesAdmin()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getUsersAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.users.findMany).mockRejectedValue(dbError);

      await expect(getUsersAdmin()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('updateUserAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.users.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.users.update).mockRejectedValue(dbError);

      await expect(updateUserAdmin(1, {
        username: 'u', nameFirst: 'N', nameLast: 'L', email: 'e@e.com',
        role: 'USER' as never, approvedByAdmin: true, emailVerified: true,
      })).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteUserAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.users.findUnique).mockResolvedValue({ userId: 1 } as never);
      vi.mocked(prisma.users.delete).mockRejectedValue(dbError);

      await expect(deleteUserAdmin(1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getNewsAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.news.findMany).mockRejectedValue(dbError);

      await expect(getNewsAdmin()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getChangelogTableNames rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.changelog.findMany).mockRejectedValue(dbError);

      await expect(getChangelogTableNames('CREATED' as never)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getChangelogByTable rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.changelog.findMany).mockRejectedValue(dbError);

      await expect(getChangelogByTable('CREATED' as never, 'entities' as never)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getUserActivityOverview rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.$queryRaw).mockRejectedValue(dbError);

      await expect(getUserActivityOverview()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getReferencesAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.references.findMany).mockRejectedValue(dbError);

      await expect(getReferencesAdmin()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteReferenceAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.references.findUnique).mockResolvedValue({ referenceId: 1, value: 'ref' } as never);
      vi.mocked(prisma.references.delete).mockRejectedValue(dbError);

      await expect(deleteReferenceAdmin(1, 1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getApproveUserAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.users.findMany).mockRejectedValue(dbError);

      await expect(getApproveUserAdmin()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('updateApproveUserAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.users.findUnique).mockResolvedValue({ userId: 1 } as never);
      vi.mocked(prisma.users.update).mockRejectedValue(dbError);

      await expect(updateApproveUserAdmin(1, { approvedByAdmin: true })).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteApproveUserAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.users.findUnique).mockResolvedValue({ userId: 1 } as never);
      vi.mocked(prisma.users.delete).mockRejectedValue(dbError);

      await expect(deleteApproveUserAdmin(1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getApproveUserCountAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.users.count).mockRejectedValue(dbError);

      await expect(getApproveUserCountAdmin()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getProjectsAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.projects.findMany).mockRejectedValue(dbError);

      await expect(getProjectsAdmin()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteProjectAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.projects.findUnique).mockResolvedValue({ projectId: 1, projectKey: 'p1' } as never);
      vi.mocked(prisma.projects.delete).mockRejectedValue(dbError);

      await expect(deleteProjectAdmin('p1', 1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getDatasetsAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.datasets.findMany).mockRejectedValue(dbError);

      await expect(getDatasetsAdmin()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteDatasetAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.datasets.findUnique).mockResolvedValue({ datasetId: 1, datasetKey: 'ds1' } as never);
      vi.mocked(prisma.datasets.delete).mockRejectedValue(dbError);

      await expect(deleteDatasetAdmin('ds1', 1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getVersionsAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.versions.findMany).mockRejectedValue(dbError);

      await expect(getVersionsAdmin()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteVersionAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.versions.findUnique).mockResolvedValue({ versionId: 1, versionKey: 'v1' } as never);
      vi.mocked(prisma.versions.delete).mockRejectedValue(dbError);

      await expect(deleteVersionAdmin('v1', 1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getEntityNamesAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entityNames.findMany).mockRejectedValue(dbError);

      await expect(getEntityNamesAdmin()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteEntityNameAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entityNames.findUnique).mockResolvedValue({ entityNameId: 1, polpalId: 100, name: 'SPD' } as never);
      vi.mocked(prisma.entityNames.delete).mockRejectedValue(dbError);

      await expect(deleteEntityNameAdmin(1, 1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getEntityChangesAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entityChanges.findMany).mockRejectedValue(dbError);

      await expect(getEntityChangesAdmin()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteEntityChangeAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entityChanges.findUnique).mockResolvedValue({ entityChangeId: 1, polpalIdOld: 10, polpalIdNew: 20 } as never);
      vi.mocked(prisma.entities.findUnique).mockResolvedValue({ polpalId: 10, nameEnglish: 'Old' } as never);
      vi.mocked(prisma.entityChanges.delete).mockRejectedValue(dbError);

      await expect(deleteEntityChangeAdmin(1, 1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getEntitiesInCountriesAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entitiesInCountries.findMany).mockRejectedValue(dbError);

      await expect(getEntitiesInCountriesAdmin()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteEntityInCountriesAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entitiesInCountries.findUnique).mockResolvedValue({ entityInCountryId: 1, polpalId: 100, countrycodePolpal: 'DE' } as never);
      vi.mocked(prisma.entitiesInCountries.delete).mockRejectedValue(dbError);

      await expect(deleteEntityInCountriesAdmin(1, 1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getGroupingMembersAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.groupingMembers.findMany).mockRejectedValue(dbError);

      await expect(getGroupingMembersAdmin()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteGroupingMemberAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.groupingMembers.findUnique).mockResolvedValue({ groupingMemberId: 1, entityId: 100, groupingId: 200 } as never);
      vi.mocked(prisma.entities.findUnique).mockResolvedValue({ polpalId: 100, nameEnglish: 'Party' } as never);
      vi.mocked(prisma.groupingMembers.delete).mockRejectedValue(dbError);

      await expect(deleteGroupingMemberAdmin(1, 1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getEntriesAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entries.findMany).mockRejectedValue(dbError);

      await expect(getEntriesAdmin()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteEntryAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.entries.findUnique).mockResolvedValue({ entryId: 1 } as never);
      vi.mocked(prisma.entries.delete).mockRejectedValue(dbError);

      await expect(deleteEntryAdmin(1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getLinkEntriesEntitiesAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.linksEntryToEntity.findMany).mockRejectedValue(dbError);

      await expect(getLinkEntriesEntitiesAdmin()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteLinkEntryEntityAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.linksEntryToEntity.findUnique).mockResolvedValue({ linkEntriesToEntityId: 1, uniqueObservationId: 'obs1' } as never);
      vi.mocked(prisma.linksEntryToEntity.delete).mockRejectedValue(dbError);

      await expect(deleteLinkEntryEntityAdmin(1, 1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getValidationLinksAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.validationLinks.findMany).mockRejectedValue(dbError);

      await expect(getValidationLinksAdmin()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteValidationLinkAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.validationLinks.findUnique).mockResolvedValue({ validationId: 1 } as never);
      vi.mocked(prisma.validationLinks.delete).mockRejectedValue(dbError);

      await expect(deleteValidationLinkAdmin(1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getAboutAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.about.findMany).mockRejectedValue(dbError);

      await expect(getAboutAdmin()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteAboutAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.about.findUnique).mockResolvedValue({ id: 1 } as never);
      vi.mocked(prisma.about.delete).mockRejectedValue(dbError);

      await expect(deleteAboutAdmin(1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getReportTicketsAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.reportTicket.findMany).mockRejectedValue(dbError);

      await expect(getReportTicketsAdmin()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('deleteReportTicketAdmin rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.reportTicket.findUnique).mockResolvedValue({ id: 1 } as never);
      vi.mocked(prisma.reportTicket.delete).mockRejectedValue(dbError);

      await expect(deleteReportTicketAdmin(1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('getUserForApprovalDeletion rethrows database errors after logging', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(prisma.users.findUnique).mockRejectedValue(dbError);

      await expect(getUserForApprovalDeletion(1)).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
