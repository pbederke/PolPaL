import 'server-only';
import { ChangeActionEnum, RoleEnum, TableNamesEnum } from '@/lib/shared/enums';
import { prisma } from '@/lib/server/prisma.server';
import { logChangelog } from '@/lib/server/changelogLogger';
import logger from '@/lib/server/logger.server';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

export async function createUserAdmin(data: {
  username: string;
  nameFirst: string;
  nameLast: string;
  email: string;
  password: string;
  role: RoleEnum;
  approvedByAdmin: boolean;
  emailVerified: boolean;
}) {
  try {
    const conflict = await prisma.users.findFirst({
      where: { OR: [{ email: data.email }, { username: data.username }] },
      select: { email: true, username: true },
    });
    if (conflict?.username === data.username)
      throw Object.assign(new Error('Username is already taken.'), { code: 'CONFLICT_USERNAME' });
    if (conflict?.email === data.email)
      throw Object.assign(new Error('Email is already in use.'), { code: 'CONFLICT_EMAIL' });

    const hashedPassword = await bcrypt.hash(data.password, 12);

    return await prisma.users.create({
      data: {
        username: data.username,
        nameFirst: data.nameFirst,
        nameLast: data.nameLast,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        approvedByAdmin: data.approvedByAdmin,
        emailVerified: data.emailVerified,
      },
      select: {
        userId: true,
        username: true,
        nameFirst: true,
        nameLast: true,
        email: true,
        role: true,
        approvedByAdmin: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    logger.error({ err: error, username: data.username }, 'createUserAdmin failed');
    throw error;
  }
}

export async function getEntitiesAdmin(skip = 0, take = 1000) {
  try {
    const [items, total] = await Promise.all([
      prisma.entities.findMany({
        select: {
          polpalId: true,
          partyfactsId: true,
          isHidden: true,
          isHiddenReason: true,
          nameShort: true,
          nameEnglish: true,
          name: true,
          entityType: true,
          wikipediaUrl: true,
          wikidataId: true,
          logoUrl: true,
          logoUrlCachedAt: true,
          logoAttribution: true,
          color: true,
          colorCachedAt: true,
          comment: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
          EntitiesInCountries: {
            select: {
              Countries: {
                select: {
                  countrycodePolpal: true,
                  countryname: true,
                  iso2c: true,
                  region: true,
                },
              },
            },
          },
        },
        orderBy: { polpalId: 'asc' },
        skip,
        take,
      }),
      prisma.entities.count(),
    ]);
    return { items, total };
  } catch (error) {
    logger.error({ err: error }, 'getEntitiesAdmin failed');
    throw error;
  }
}

export async function getCountriesAdmin(skip = 0, take = 1000) {
  try {
    const [items, total] = await Promise.all([
      prisma.countries.findMany({
        orderBy: { countryId: 'asc' },
        skip,
        take,
      }),
      prisma.countries.count(),
    ]);
    return { items, total };
  } catch (error) {
    logger.error({ err: error }, 'getCountriesAdmin failed');
    throw error;
  }
}

export async function getUsersAdmin(skip = 0, take = 1000) {
  try {
    const [items, total] = await Promise.all([
      prisma.users.findMany({
        select: {
          userId: true,
          username: true,
          nameFirst: true,
          nameLast: true,
          email: true,
          role: true,
          approvedByAdmin: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { userId: 'asc' },
        skip,
        take,
      }),
      prisma.users.count(),
    ]);
    return { items, total };
  } catch (error) {
    logger.error({ err: error }, 'getUsersAdmin failed');
    throw error;
  }
}

export async function updateUserAdmin(
  userId: number,
  data: {
    username: string;
    nameFirst: string;
    nameLast: string;
    email: string;
    role: RoleEnum;
    approvedByAdmin: boolean;
    emailVerified: boolean;
  }
) {
  try {
    const conflictUsername = await prisma.users.findFirst({
      where: { username: data.username, NOT: { userId } },
      select: { userId: true },
    });
    if (conflictUsername) throw Object.assign(new Error('Username is already taken.'), { code: 'CONFLICT_USERNAME' });

    const conflictEmail = await prisma.users.findFirst({
      where: { email: data.email, NOT: { userId } },
      select: { userId: true },
    });
    if (conflictEmail) throw Object.assign(new Error('Email is already in use.'), { code: 'CONFLICT_EMAIL' });

    return await prisma.users.update({
      where: { userId },
      data: {
        username: data.username,
        nameFirst: data.nameFirst,
        nameLast: data.nameLast,
        email: data.email,
        role: data.role,
        approvedByAdmin: data.approvedByAdmin,
        emailVerified: data.emailVerified,
        tokenVersion: { increment: 1 },
      },
      select: {
        userId: true,
        username: true,
        nameFirst: true,
        nameLast: true,
        email: true,
        role: true,
        approvedByAdmin: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    logger.error({ err: error, userId }, 'updateUserAdmin failed');
    throw error;
  }
}

export async function deleteUserAdmin(
  deleteUserId: number,
) {
  try {
    const existingUser = await prisma.users.findUnique({
      where: { userId: deleteUserId }
    });

    if (!existingUser) {
      throw Object.assign(new Error('User not found'), { code: 'P2025' });
    }

    await prisma.users.delete({
      where: { userId: deleteUserId },
    });
  } catch (error) {
    logger.error({ err: error, deleteUserId }, 'deleteUserAdmin failed');
    throw error;
  }
}

export async function getNewsAdmin(skip = 0, take = 1000) {
  try {
    const [items, total] = await Promise.all([
      prisma.news.findMany({
        select: {
          newsId: true,
          title: true,
          content: true,
          links: true,
          publishedPublicAt: true,
          updatedPublicAt: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
        },
        orderBy: { newsId: 'asc' },
        skip,
        take,
      }),
      prisma.news.count(),
    ]);
    return { items, total };
  } catch (error) {
    logger.error({ err: error }, 'getNewsAdmin failed');
    throw error;
  }
}

// Max rows returned for a single table's changelog view (safety cap against unbounded queries).
const CHANGELOG_TABLE_MAX = 50000;

// Distinct tableNames that have at least one non-bulk entry for the given action.
// Used to populate the table selector before any log rows are fetched.
export async function getChangelogTableNames(action: ChangeActionEnum) {
  try {
    const rows = await prisma.changelog.findMany({
      where: { action, bulk: false },
      distinct: ['tableName'],
      select: { tableName: true },
      orderBy: { tableName: 'asc' },
    });
    return rows.map((r) => r.tableName);
  } catch (error) {
    logger.error({ err: error, action }, 'getChangelogTableNames failed');
    throw error;
  }
}

// All non-bulk changelog rows for a specific action + tableName (no pagination, capped).
export async function getChangelogByTable(action: ChangeActionEnum, tableName: TableNamesEnum) {
  try {
    const where = { action, tableName, bulk: false } as const;
    const [logs, totalCount] = await Promise.all([
      prisma.changelog.findMany({
        where,
        orderBy: { changedAt: 'desc' },
        take: CHANGELOG_TABLE_MAX,
      }),
      prisma.changelog.count({ where }),
    ]);
    return { logs, totalCount };
  } catch (error) {
    logger.error({ err: error, action, tableName }, 'getChangelogByTable failed');
    throw error;
  }
}

// -------------------------------------------------------------------------
// USER ACTIVITY OVERVIEW
// -------------------------------------------------------------------------

// Activity categories tracked per user. Each maps to a (tableName, action)
// pair in the Changelog. A single logical edit may span several changelog rows
// (one per changed field) that share a batchId, so activity is counted as the
// number of distinct batchIds (falling back to the changelogId when null).
export interface UserActivityCategory {
  key: string;
  label: string;
}

const ACTIVITY_CATEGORIES: (UserActivityCategory & {
  tableName: TableNamesEnum;
  action: ChangeActionEnum;
})[] = [
    { key: 'entitiesCreated', label: 'Entities created', tableName: TableNamesEnum.entities, action: ChangeActionEnum.CREATED },
    { key: 'entitiesUpdated', label: 'Entities updated', tableName: TableNamesEnum.entities, action: ChangeActionEnum.UPDATED },
    { key: 'entitiesDeleted', label: 'Entities deleted', tableName: TableNamesEnum.entities, action: ChangeActionEnum.DELETED },
    { key: 'entityNamesAdded', label: 'Entity names added', tableName: TableNamesEnum.entityNames, action: ChangeActionEnum.CREATED },
    { key: 'entityChangesAdded', label: 'Entity changes added', tableName: TableNamesEnum.entityChanges, action: ChangeActionEnum.CREATED },
    { key: 'groupingMembersAdded', label: 'Grouping memberships added', tableName: TableNamesEnum.groupingMembers, action: ChangeActionEnum.CREATED },
    { key: 'linksCreated', label: 'Links created', tableName: TableNamesEnum.linksEntriesToEntities, action: ChangeActionEnum.CREATED },
    { key: 'linksDeleted', label: 'Links deleted', tableName: TableNamesEnum.linksEntriesToEntities, action: ChangeActionEnum.DELETED },
  ];

export interface UserActivityRow {
  userId: number;
  name: string;
  username: string;
  email: string;
  counts: Record<string, number>;
  total: number;
}

export interface UserActivityOverview {
  categories: UserActivityCategory[];
  users: UserActivityRow[];
  totals: Record<string, number>;
  grandTotal: number;
  range: { from: string | null; to: string | null };
}

// Aggregate per-user activity counts across the tracked categories, optionally
// restricted to a [from, to] date range. Bulk operations are excluded so the
// figures reflect manual user work only. Only users with at least one activity
// are returned. Each category count is distinct-batchId based (see above).
export async function getUserActivityOverview(
  from?: Date,
  to?: Date,
): Promise<UserActivityOverview> {
  try {
    const dateConditions: Prisma.Sql[] = [];
    if (from) dateConditions.push(Prisma.sql`AND c."changedAt" >= ${from}`);
    if (to) dateConditions.push(Prisma.sql`AND c."changedAt" <= ${to}`);
    const dateFilter = dateConditions.length ? Prisma.join(dateConditions, ' ') : Prisma.empty;

    const rows = await prisma.$queryRaw<
      { userId: number; tableName: string; action: string; count: bigint }[]
    >`
      SELECT
        c."userId"          AS "userId",
        c."tableName"::text AS "tableName",
        c."action"::text    AS "action",
        COUNT(DISTINCT COALESCE(c."changelogId"::text)) AS "count"
      FROM "Changelog" c
      WHERE c."userId" IS NOT NULL
        AND (
          (c."tableName" = 'entities'              AND c."action" IN ('CREATED', 'UPDATED', 'DELETED'))
          OR (c."tableName" = 'entityNames'            AND c."action" = 'CREATED')
          OR (c."tableName" = 'entityChanges'          AND c."action" = 'CREATED')
          OR (c."tableName" = 'groupingMembers'        AND c."action" = 'CREATED')
          OR (c."tableName" = 'linksEntriesToEntities' AND c."action" = 'CREATED')
          OR (c."tableName" = 'linksEntriesToEntities' AND c."action" = 'DELETED')
        )
        ${dateFilter}
      GROUP BY c."userId", c."tableName", c."action"
    `;

    // Resolve (tableName, action) -> category key.
    const categoryKeyOf = (tableName: string, action: string): string | undefined =>
      ACTIVITY_CATEGORIES.find((cat) => cat.tableName === tableName && cat.action === action)?.key;

    const emptyCounts = (): Record<string, number> =>
      Object.fromEntries(ACTIVITY_CATEGORIES.map((cat) => [cat.key, 0]));

    const perUser = new Map<number, Record<string, number>>();
    const totals = emptyCounts();

    for (const row of rows) {
      const key = categoryKeyOf(row.tableName, row.action);
      if (!key) continue;
      const count = Number(row.count);
      if (!perUser.has(row.userId)) perUser.set(row.userId, emptyCounts());
      perUser.get(row.userId)![key] += count;
      totals[key] += count;
    }

    const userIds = [...perUser.keys()];
    const userInfos = userIds.length
      ? await prisma.users.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, nameFirst: true, nameLast: true, username: true, email: true },
      })
      : [];
    const userInfoById = new Map(userInfos.map((u) => [u.userId, u]));

    const users: UserActivityRow[] = userIds.map((userId) => {
      const counts = perUser.get(userId)!;
      const info = userInfoById.get(userId);
      const fullName = info ? `${info.nameFirst} ${info.nameLast}`.trim() : '';
      const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
      return {
        userId,
        name: fullName || info?.username || `User #${userId}`,
        username: info?.username ?? '',
        email: info?.email ?? '',
        counts,
        total,
      };
    });

    users.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

    const grandTotal = Object.values(totals).reduce((sum, n) => sum + n, 0);

    return {
      categories: ACTIVITY_CATEGORIES.map(({ key, label }) => ({ key, label })),
      users,
      totals,
      grandTotal,
      range: { from: from?.toISOString() ?? null, to: to?.toISOString() ?? null },
    };
  } catch (error) {
    logger.error({ err: error }, 'getUserActivityOverview failed');
    throw error;
  }
}

export async function getReferencesAdmin() {
  try {
    return await prisma.references.findMany({ take: 1000 });
  } catch (error) {
    logger.error({ err: error }, 'getReferencesAdmin failed');
    throw error;
  }
}

export async function deleteReferenceAdmin(referenceId: number, userId: number, comment?: string) {
  try {
    const existing = await prisma.references.findUnique({ where: { referenceId } });
    if (!existing) throw Object.assign(new Error('Reference not found'), { code: 'P2025' });
    await prisma.references.delete({ where: { referenceId } });
    await logChangelog({
      tableName: TableNamesEnum.references,
      recordId: existing.referenceId,
      recordName: existing.value,
      action: ChangeActionEnum.DELETED,
      field: '__deleted__',
      oldValue: JSON.stringify(existing),
      comment: comment?.trim() || undefined,
      batchId: crypto.randomUUID(),
      userId,
    });
  } catch (error) {
    logger.error({ err: error, referenceId, userId }, 'deleteReferenceAdmin failed');
    throw error;
  }
}

export async function getApproveUserAdmin() {
  try {
    return await prisma.users.findMany({
      where: {
        approvedByAdmin: false,
        emailVerified: true,
      },
      take: 1000,
      select: {
        userId: true,
        username: true,
        nameFirst: true,
        nameLast: true,
        email: true,
        emailVerified: true,
        role: true,
        approvedByAdmin: true,
        createdAt: true,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'getApproveUserAdmin failed');
    throw error;
  }
}

export async function updateApproveUserAdmin(
  approveUserId: number,
  data: Partial<{
    approvedByAdmin: boolean;
    role: RoleEnum;
  }>,

) {
  try {
    const existingUser = await prisma.users.findUnique({
      where: { userId: approveUserId }
    });

    if (!existingUser) {
      throw new Error("User (to approve) not found")
    }

    // Perform update and increment tokenVersion to invalidate existing sessions
    return await prisma.users.update({
      where: { userId: approveUserId },
      data: {
        ...data,
        tokenVersion: { increment: 1 },
      },
      select: {
        userId: true,
        username: true,
        nameFirst: true,
        nameLast: true,
        email: true,
        role: true,
        approvedByAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    logger.error({ err: error, approveUserId }, 'updateApproveUserAdmin failed');
    throw error;
  }
}

export async function deleteApproveUserAdmin(
  approveUserId: number,
) {
  try {
    const existingUser = await prisma.users.findUnique({
      where: { userId: approveUserId }
    });

    if (!existingUser) {
      throw new Error("User (to approve) not found")
    }

    // Perform deletion without transaction
    await prisma.users.delete({
      where: { userId: approveUserId },
    });

    return;
  } catch (error) {
    logger.error({ err: error, approveUserId }, 'deleteApproveUserAdmin failed');
    throw error;
  }
}


export async function getApproveUserCountAdmin() {
  try {
    const count = await prisma.users.count({
      where: {
        approvedByAdmin: false,
        emailVerified: true,
      },
    });
    return { count };
  } catch (error) {
    logger.error({ err: error }, 'getApproveUserCountAdmin failed');
    throw error;
  }
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function getProjectsAdmin(skip = 0, take = 1000) {
  try {
    const [items, total] = await Promise.all([
      prisma.projects.findMany({
        select: {
          projectId: true,
          isHidden: true,
          isHiddenReason: true,
          projectKey: true,
          projectNameShort: true,
          projectName: true,
          projectUrl: true,
          projectDescription: true,
          comment: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { projectId: 'asc' },
        skip,
        take,
      }),
      prisma.projects.count(),
    ]);
    return { items, total };
  } catch (error) {
    logger.error({ err: error }, 'getProjectsAdmin failed');
    throw error;
  }
}

export async function deleteProjectAdmin(projectKey: string, userId: number, comment?: string) {
  try {
    const record = await prisma.projects.findUnique({ where: { projectKey } });
    if (!record) throw Object.assign(new Error('Not found'), { code: 'P2025' });
    await prisma.projects.delete({ where: { projectKey } });
    await logChangelog({
      tableName: TableNamesEnum.projects,
      recordId: record.projectId,
      recordName: record.projectKey,
      action: ChangeActionEnum.DELETED,
      field: '__deleted__',
      oldValue: JSON.stringify(record),
      comment: comment?.trim() || undefined,
      batchId: crypto.randomUUID(),
      userId,
    });
  } catch (error) {
    logger.error({ err: error, projectKey, userId }, 'deleteProjectAdmin failed');
    throw error;
  }
}

// ─── Datasets ────────────────────────────────────────────────────────────────

export async function getDatasetsAdmin(skip = 0, take = 1000) {
  try {
    const [items, total] = await Promise.all([
      prisma.datasets.findMany({
        select: {
          datasetId: true,
          isHidden: true,
          isHiddenReason: true,
          projectKey: true,
          datasetKey: true,
          datasetNameShort: true,
          datasetName: true,
          datasetUrl: true,
          datasetDescription: true,
          comment: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { datasetId: 'asc' },
        skip,
        take,
      }),
      prisma.datasets.count(),
    ]);
    return { items, total };
  } catch (error) {
    logger.error({ err: error }, 'getDatasetsAdmin failed');
    throw error;
  }
}

export async function deleteDatasetAdmin(datasetKey: string, userId: number, comment?: string) {
  try {
    const record = await prisma.datasets.findUnique({ where: { datasetKey } });
    if (!record) throw Object.assign(new Error('Not found'), { code: 'P2025' });
    await prisma.datasets.delete({ where: { datasetKey } });
    await logChangelog({
      tableName: TableNamesEnum.datasets,
      recordId: record.datasetId,
      recordName: record.datasetKey,
      action: ChangeActionEnum.DELETED,
      field: '__deleted__',
      oldValue: JSON.stringify(record),
      comment: comment?.trim() || undefined,
      batchId: crypto.randomUUID(),
      userId,
    });
  } catch (error) {
    logger.error({ err: error, datasetKey, userId }, 'deleteDatasetAdmin failed');
    throw error;
  }
}

// ─── Versions ────────────────────────────────────────────────────────────────

export async function getVersionsAdmin(skip = 0, take = 1000) {
  try {
    const [items, total] = await Promise.all([
      prisma.versions.findMany({
        select: {
          versionId: true,
          isHidden: true,
          isHiddenReason: true,
          projectKey: true,
          datasetKey: true,
          versionKey: true,
          version: true,
          versionName: true,
          versionUrl: true,
          versionCitation: true,
          commentVersion: true,
          commentEntries: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { versionId: 'asc' },
        skip,
        take,
      }),
      prisma.versions.count(),
    ]);
    return { items, total };
  } catch (error) {
    logger.error({ err: error }, 'getVersionsAdmin failed');
    throw error;
  }
}

export async function deleteVersionAdmin(versionKey: string, userId: number, comment?: string) {
  try {
    const record = await prisma.versions.findUnique({ where: { versionKey } });
    if (!record) throw Object.assign(new Error('Not found'), { code: 'P2025' });
    await prisma.versions.delete({ where: { versionKey } });
    await logChangelog({
      tableName: TableNamesEnum.versions,
      recordId: record.versionId,
      recordName: record.versionKey,
      action: ChangeActionEnum.DELETED,
      field: '__deleted__',
      oldValue: JSON.stringify(record),
      comment: comment?.trim() || undefined,
      batchId: crypto.randomUUID(),
      userId,
    });
  } catch (error) {
    logger.error({ err: error, versionKey, userId }, 'deleteVersionAdmin failed');
    throw error;
  }
}

// ─── Entity Names ─────────────────────────────────────────────────────────────

export async function getEntityNamesAdmin(skip = 0, take = 1000) {
  try {
    const [items, total] = await Promise.all([
      prisma.entityNames.findMany({
        select: {
          entityNameId: true,
          polpalId: true,
          nameShort: true,
          name: true,
          language: true,
          comment: true,
          startYear: true,
          startMonth: true,
          startDay: true,
          endYear: true,
          endMonth: true,
          endDay: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
        },
        orderBy: { entityNameId: 'asc' },
        skip,
        take,
      }),
      prisma.entityNames.count(),
    ]);
    return { items, total };
  } catch (error) {
    logger.error({ err: error }, 'getEntityNamesAdmin failed');
    throw error;
  }
}

export async function deleteEntityNameAdmin(entityNameId: number, userId: number, comment?: string) {
  try {
    const record = await prisma.entityNames.findUnique({ where: { entityNameId } });
    if (!record) throw Object.assign(new Error('Not found'), { code: 'P2025' });
    await prisma.entityNames.delete({ where: { entityNameId } });
    await logChangelog({
      tableName: TableNamesEnum.entityNames,
      recordId: record.entityNameId,
      recordName: `${record.name} (${record.polpalId})`,
      action: ChangeActionEnum.DELETED,
      field: '__deleted__',
      oldValue: JSON.stringify(record),
      comment: comment?.trim() || undefined,
      batchId: crypto.randomUUID(),
      userId,
    });
  } catch (error) {
    logger.error({ err: error, entityNameId, userId }, 'deleteEntityNameAdmin failed');
    throw error;
  }
}

// ─── Entity Changes ───────────────────────────────────────────────────────────

export async function getEntityChangesAdmin(skip = 0, take = 1000) {
  try {
    const [items, total] = await Promise.all([
      prisma.entityChanges.findMany({
        select: {
          entityChangeId: true,
          polpalIdOld: true,
          polpalIdNew: true,
          changeYear: true,
          changeMonth: true,
          changeDay: true,
          changeType: true,
          comment: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
        },
        orderBy: { entityChangeId: 'asc' },
        skip,
        take,
      }),
      prisma.entityChanges.count(),
    ]);
    return { items, total };
  } catch (error) {
    logger.error({ err: error }, 'getEntityChangesAdmin failed');
    throw error;
  }
}

export async function deleteEntityChangeAdmin(entityChangeId: number, userId: number, comment?: string) {
  try {
    const record = await prisma.entityChanges.findUnique({ where: { entityChangeId } });
    if (!record) throw Object.assign(new Error('Not found'), { code: 'P2025' });
    const entityOld = await prisma.entities.findUnique({ where: { polpalId: record.polpalIdOld } });
    const entityNew = await prisma.entities.findUnique({ where: { polpalId: record.polpalIdNew } });
    await prisma.entityChanges.delete({ where: { entityChangeId } });
    await logChangelog({
      tableName: TableNamesEnum.entityChanges,
      recordId: record.entityChangeId,
      recordName: `${entityOld?.nameEnglish} (${entityOld?.polpalId}) changed to ${entityNew?.nameEnglish} (${entityNew?.polpalId})`,
      action: ChangeActionEnum.DELETED,
      field: '__deleted__',
      oldValue: JSON.stringify(record),
      comment: comment?.trim() || undefined,
      batchId: crypto.randomUUID(),
      userId,
    });
  } catch (error) {
    logger.error({ err: error, entityChangeId, userId }, 'deleteEntityChangeAdmin failed');
    throw error;
  }
}

// ─── Entities in Countries ────────────────────────────────────────────────────

export async function getEntitiesInCountriesAdmin(skip = 0, take = 1000) {
  try {
    const [items, total] = await Promise.all([
      prisma.entitiesInCountries.findMany({
        select: {
          entityInCountryId: true,
          polpalId: true,
          countrycodePolpal: true,
          comment: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
        },
        orderBy: { entityInCountryId: 'asc' },
        skip,
        take,
      }),
      prisma.entitiesInCountries.count(),
    ]);
    return { items, total };
  } catch (error) {
    logger.error({ err: error }, 'getEntitiesInCountriesAdmin failed');
    throw error;
  }
}

export async function deleteEntityInCountriesAdmin(entityInCountryId: number, userId: number, comment?: string) {
  try {
    const record = await prisma.entitiesInCountries.findUnique({ where: { entityInCountryId } });
    if (!record) throw Object.assign(new Error('Not found'), { code: 'P2025' });
    await prisma.entitiesInCountries.delete({ where: { entityInCountryId } });
    await logChangelog({
      tableName: TableNamesEnum.entitiesInCountries,
      recordId: record.entityInCountryId,
      recordName: `${record.polpalId} in ${record.countrycodePolpal}`,
      action: ChangeActionEnum.DELETED,
      field: '__deleted__',
      oldValue: JSON.stringify(record),
      comment: comment?.trim() || undefined,
      batchId: crypto.randomUUID(),
      userId,
    });
  } catch (error) {
    logger.error({ err: error, entityInCountryId, userId }, 'deleteEntityInCountriesAdmin failed');
    throw error;
  }
}

// ─── Grouping Members ─────────────────────────────────────────────────────────

export async function getGroupingMembersAdmin(skip = 0, take = 1000) {
  try {
    const [items, total] = await Promise.all([
      prisma.groupingMembers.findMany({
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
          createdAt: true,
          updatedAt: true,
          userId: true,
        },
        orderBy: { groupingMemberId: 'asc' },
        skip,
        take,
      }),
      prisma.groupingMembers.count(),
    ]);
    return { items, total };
  } catch (error) {
    logger.error({ err: error }, 'getGroupingMembersAdmin failed');
    throw error;
  }
}

export async function deleteGroupingMemberAdmin(groupingMemberId: number, userId: number, comment?: string) {
  try {
    const record = await prisma.groupingMembers.findUnique({ where: { groupingMemberId } });
    if (!record) throw Object.assign(new Error('Not found'), { code: 'P2025' });
    const entity = await prisma.entities.findUnique({ where: { polpalId: record.entityId } });
    const grouping = await prisma.entities.findUnique({ where: { polpalId: record.groupingId } });
    await prisma.groupingMembers.delete({ where: { groupingMemberId } });
    await logChangelog({
      tableName: TableNamesEnum.groupingMembers,
      recordId: record.groupingMemberId,
      recordName: `${entity?.nameEnglish} (${entity?.polpalId}) in ${grouping?.nameEnglish} (${grouping?.polpalId})`,
      action: ChangeActionEnum.DELETED,
      field: '__deleted__',
      oldValue: JSON.stringify(record),
      comment: comment?.trim() || undefined,
      batchId: crypto.randomUUID(),
      userId,
    });
  } catch (error) {
    logger.error({ err: error, groupingMemberId, userId }, 'deleteGroupingMemberAdmin failed');
    throw error;
  }
}

// ─── Entries ──────────────────────────────────────────────────────────────────

export async function getEntriesAdmin(skip = 0, take = 1000) {
  try {
    const [items, total] = await Promise.all([
      prisma.entries.findMany({
        select: {
          entryId: true,
          usedFile: true,
          dateDownloaded: true,
          projectKey: true,
          datasetKey: true,
          versionKey: true,
          entryCountryVar: true,
          entryCountry: true,
          entryYearVar: true,
          entryYear: true,
          entryMonthVar: true,
          entryMonth: true,
          entryDayVar: true,
          entryDay: true,
          entryEntityIdVar: true,
          entryEntityId: true,
          entryEntityNameShortVar: true,
          entryEntityNameShort: true,
          entryEntityNameEnglishVar: true,
          entryEntityNameEnglish: true,
          entryEntityNameVar: true,
          entryEntityName: true,
          additionalInformation: true,
          countrycodePolpal: true,
          uniqueObservationId: true,
          note: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
        },
        orderBy: { entryId: 'asc' },
        skip,
        take,
      }),
      prisma.entries.count(),
    ]);
    return { items, total };
  } catch (error) {
    logger.error({ err: error }, 'getEntriesAdmin failed');
    throw error;
  }
}

export async function deleteEntryAdmin(entryId: number) {
  try {
    const record = await prisma.entries.findUnique({ where: { entryId } });
    if (!record) throw Object.assign(new Error('Not found'), { code: 'P2025' });
    await prisma.entries.delete({ where: { entryId } });
  } catch (error) {
    logger.error({ err: error, entryId }, 'deleteEntryAdmin failed');
    throw error;
  }
}

// ─── Link Entries → Entities ──────────────────────────────────────────────────

export async function getLinkEntriesEntitiesAdmin(skip = 0, take = 1000) {
  try {
    const [items, total] = await Promise.all([
      prisma.linksEntryToEntity.findMany({
        select: {
          linkEntriesToEntityId: true,
          uniqueObservationId: true,
          polpalId: true,
          startYear: true,
          startMonth: true,
          startDay: true,
          endYear: true,
          endMonth: true,
          endDay: true,
          comment: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
        },
        orderBy: { linkEntriesToEntityId: 'asc' },
        skip,
        take,
      }),
      prisma.linksEntryToEntity.count(),
    ]);
    return { items, total };
  } catch (error) {
    logger.error({ err: error }, 'getLinkEntriesEntitiesAdmin failed');
    throw error;
  }
}

export async function deleteLinkEntryEntityAdmin(linkId: number, userId: number, comment?: string) {
  try {
    const record = await prisma.linksEntryToEntity.findUnique({ where: { linkEntriesToEntityId: linkId } });
    if (!record) throw Object.assign(new Error('Not found'), { code: 'P2025' });
    await prisma.linksEntryToEntity.delete({ where: { linkEntriesToEntityId: linkId } });
    await logChangelog({
      tableName: TableNamesEnum.linksEntriesToEntities,
      recordId: record.linkEntriesToEntityId,
      recordName: record.uniqueObservationId,
      action: ChangeActionEnum.DELETED,
      field: '__deleted__',
      oldValue: JSON.stringify(record),
      comment: comment?.trim() || undefined,
      batchId: crypto.randomUUID(),
      userId,
    });
  } catch (error) {
    logger.error({ err: error, linkId, userId }, 'deleteLinkEntryEntityAdmin failed');
    throw error;
  }
}

// ─── Validation Links ─────────────────────────────────────────────────────────

export async function getValidationLinksAdmin(skip = 0, take = 1000) {
  try {
    const [items, total] = await Promise.all([
      prisma.validationLinks.findMany({
        select: {
          validationId: true,
          linkId: true,
          validated: true,
          comment: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { validationId: 'asc' },
        skip,
        take,
      }),
      prisma.validationLinks.count(),
    ]);
    return { items, total };
  } catch (error) {
    logger.error({ err: error }, 'getValidationLinksAdmin failed');
    throw error;
  }
}

export async function deleteValidationLinkAdmin(validationId: number) {
  try {
    const record = await prisma.validationLinks.findUnique({ where: { validationId } });
    if (!record) throw Object.assign(new Error('Not found'), { code: 'P2025' });
    await prisma.validationLinks.delete({ where: { validationId } });
  } catch (error) {
    logger.error({ err: error, validationId }, 'deleteValidationLinkAdmin failed');
    throw error;
  }
}

// ─── About ────────────────────────────────────────────────────────────────────

export async function getAboutAdmin(skip = 0, take = 1000) {
  try {
    const [items, total] = await Promise.all([
      prisma.about.findMany({
        select: {
          id: true,
          tableName: true,
          name: true,
          affiliation: true,
          time: true,
          url: true,
          funding: true,
          comment: true,
          createdAt: true,
        },
        orderBy: { id: 'asc' },
        skip,
        take,
      }),
      prisma.about.count(),
    ]);
    return { items, total };
  } catch (error) {
    logger.error({ err: error }, 'getAboutAdmin failed');
    throw error;
  }
}

export async function deleteAboutAdmin(id: number) {
  try {
    const record = await prisma.about.findUnique({ where: { id } });
    if (!record) throw Object.assign(new Error('Not found'), { code: 'P2025' });
    await prisma.about.delete({ where: { id } });
  } catch (error) {
    logger.error({ err: error, id }, 'deleteAboutAdmin failed');
    throw error;
  }
}

// ─── Report Tickets ───────────────────────────────────────────────────────────

export async function getReportTicketsAdmin(skip = 0, take = 1000) {
  try {
    const [items, total] = await Promise.all([
      prisma.reportTicket.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          userId: true,
          url: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { id: 'asc' },
        skip,
        take,
      }),
      prisma.reportTicket.count(),
    ]);
    return { items, total };
  } catch (error) {
    logger.error({ err: error }, 'getReportTicketsAdmin failed');
    throw error;
  }
}

export async function deleteReportTicketAdmin(id: number) {
  try {
    const record = await prisma.reportTicket.findUnique({ where: { id } });
    if (!record) throw Object.assign(new Error('Not found'), { code: 'P2025' });
    await prisma.reportTicket.delete({ where: { id } });
  } catch (error) {
    logger.error({ err: error, id }, 'deleteReportTicketAdmin failed');
    throw error;
  }
}

// Fetches the minimal user fields needed to send a notification email before deletion.
export async function getUserForApprovalDeletion(
  userId: number,
): Promise<{ email: string; username: string } | null> {
  try {
    return await prisma.users.findUnique({
      where: { userId },
      select: { email: true, username: true },
    });
  } catch (error) {
    logger.error({ err: error, userId }, 'getUserForApprovalDeletion failed');
    throw error;
  }
}
