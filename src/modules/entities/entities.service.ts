import 'server-only';
import {
  EntityTypesEnum,
  TableNamesEnum,
  ChangeActionEnum,
  RoleEnum,
} from "@/lib/shared/enums";
import { prisma } from "@/lib/server/prisma.server";
import logger from "@/lib/server/logger.server";
import { logChangelog } from "@/lib/server/changelogLogger";

// ------------------------------------------------------------------------------
// Get
// ------------------------------------------------------------------------------

export async function getEntities() {
  try {
    return await prisma.entities.findMany({
      where: { 
        isHidden: false, 
        entityType: { 
        notIn: [EntityTypesEnum.OTHERS, EntityTypesEnum.INDEPENDENT, EntityTypesEnum.RESIDUAL, EntityTypesEnum.UNKNOWN] 
        },
      },
      orderBy: {
        nameEnglish: 'asc'
      },
      select: {
        isHidden: true,
        isHiddenReason: true,
        polpalId: true,
        partyfactsId: true,
        nameShort: true,
        nameEnglish: true,
        name: true,
        entityType: true,
        wikidataId: true,
        wikipediaUrl: true,
        color: true,
        EntityNames: {
          select: {
            nameShort: true,
            name: true,
            language: true,
            startYear: true,
            startMonth: true,
            startDay: true,
            endYear: true,
            endMonth: true,
            endDay: true
          },
        },
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
    },
    );
  } catch (error) {
    logger.error({ err: error }, 'getEntities failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// CREATE
// ------------------------------------------------------------------------------

export async function createEntity(
  data: {
    nameShort: string;
    nameEnglish: string;
    name?: string | null;
    entityType: EntityTypesEnum;
    partyfactsId?: number | null;
    wikidataId?: string | null;
    wikipediaUrl?: string | null;
    comment?: string | null;
  },
  userId: number,
) {
  try {
    const createdEntity = await prisma.entities.create({
      data: {
        nameShort: data.nameShort,
        nameEnglish: data.nameEnglish,
        name: data.name,
        entityType: data.entityType,
        partyfactsId: data.partyfactsId,
        wikidataId: data.wikidataId,
        wikipediaUrl: data.wikipediaUrl,
        comment: data.comment,
        userId: userId,
      }
    })

    const batchId = crypto.randomUUID();

    // Create changelog entry for creation
    await logChangelog({
      tableName: TableNamesEnum.entities,
      recordId: createdEntity.polpalId,
      recordName: createdEntity.nameEnglish,
      action: ChangeActionEnum.CREATED,
      field: '__created__',
      oldValue: undefined,
      newValue: JSON.stringify(data),
      comment: undefined,
      batchId: batchId,
      userId: userId,
    });

    return createdEntity;
  } catch (error) {
    logger.error({ err: error, nameShort: data.nameShort }, 'createEntity failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// DELETE
// ------------------------------------------------------------------------------

export async function deleteEntity(polpalId: number, userId: number, role: RoleEnum, comment?: string) {
  try {
    const existingEntity = await prisma.entities.findUnique({
      where: { polpalId },
    });

    if (!existingEntity) {
      throw new Error("Entity not found");
    }

    if (role === RoleEnum.CONTRIBUTOR && existingEntity.userId !== userId) {
      throw Object.assign(new Error("Forbidden: You can only delete entities you created"), { code: 'FORBIDDEN' });
    }

    const batchId = crypto.randomUUID();

    await logChangelog({
      tableName: TableNamesEnum.entities,
      recordId: polpalId,
      recordName: existingEntity.nameEnglish,
      action: ChangeActionEnum.DELETED,
      field: '__deleted__',
      oldValue: JSON.stringify(existingEntity),
      newValue: undefined,
      comment: comment?.trim() || undefined,
      batchId: batchId,
      userId: userId,
    });

    return await prisma.entities.delete({
      where: { polpalId },
    });
  } catch (error) {
    logger.error({ err: error, polpalId }, 'deleteEntity failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Update
// ------------------------------------------------------------------------------

export async function updateEntity(
  userId: number,
  polpalId: number,
  data: Partial<{
    isHidden: boolean;
    isHiddenReason: string | null;
    nameShort: string;
    nameEnglish: string;
    name: string | null;
    entityType: EntityTypesEnum;
    partyfactsId: number | null;
    wikidataId: string | null;
    wikipediaUrl: string | null;
    comment: string | null;
  }>,

) {
  try {
    const existingEntity = await prisma.entities.findUnique({
      where: { polpalId },
    });

    if (!existingEntity) {
      throw new Error("Entity not found");
    }

    // Prevent hiding an entity that still has active dataset links
    if (data.isHidden === true && !existingEntity.isHidden) {
      const linkCount = await prisma.linksEntryToEntity.count({
        where: { polpalId },
      });
      if (linkCount > 0) {
        throw new Error(
          `Cannot hide this entity: it still has ${linkCount} dataset link${linkCount !== 1 ? "s" : ""}. Remove all links before hiding it.`
        );
      }
    }

    // Compare changes
    const changedFields: {
      field: string;
      oldValue: string | undefined;
      newValue: string | undefined;
    }[] = [];

    for (const key in data) {
      const oldVal = (existingEntity as Record<string, unknown>)[key];
      const newVal = (data as Record<string, unknown>)[key];
      // Use strict inequality, but also treat null/undefined consistently
      if (
        (oldVal === null || oldVal === undefined) && (newVal === null || newVal === undefined)
          ? false
          : oldVal !== newVal
      ) {
        changedFields.push({
          field: key,
          oldValue: oldVal?.toString() ?? undefined,
          newValue: newVal?.toString() ?? undefined,
        });
      }
    }

    // If no changes detected, just return existing country
    if (changedFields.length === 0) {
      return existingEntity;
    }

    const batchId = crypto.randomUUID();

    // If wikidataId is changing, invalidate the cached logo URL
    const wikidataIdChanged = 'wikidataId' in data && data.wikidataId !== existingEntity.wikidataId;
    const updatedEntity = await prisma.entities.update({
      where: { polpalId },
      data: {
        ...data,
        ...(wikidataIdChanged ? { logoUrl: null, logoUrlCachedAt: null, color: null, colorCachedAt: null } : {}),
      },
    });

    for (const change of changedFields) {
      await logChangelog({
        tableName: TableNamesEnum.entities,
        recordId: existingEntity.polpalId,
        recordName: existingEntity.nameEnglish,
        action: ChangeActionEnum.UPDATED,
        field: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
        batchId,
        userId,
      });
    }

    return updatedEntity;
  } catch (error) {
    logger.error({ err: error, polpalId }, 'updateEntity failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// GET by polpalId
// ------------------------------------------------------------------------------

export async function getEntityByPolpalId(polpalId: number, isAuthenticated: boolean = true) {
  try {
    // First query: Get entity data without entries
    const entityPromise = prisma.entities.findUnique({
    where: {
      polpalId: polpalId,
    },
    select: {
      isHidden: true,
      isHiddenReason: true,
      polpalId: true,
      partyfactsId: true,
      nameShort: true,
      nameEnglish: true,
      name: true,
      entityType: true,
      wikidataId: true,
      wikipediaUrl: true,
      logoUrl: true,
      comment: true,
      References: true,
      EntitiesInCountries: {
        select: {
          countrycodePolpal: true,
          comment: true,
          References: true,
          Countries: {
            select: {
              countryname: true,
              iso2c: true,
              region: true,
            },
          },
        },
      },
      GroupingMembers: {
        where: { Entities: { isHidden: false } },
        select: {
          groupingMemberId: true,
          Entities: {
            select: {
              polpalId: true,
              nameShort: true,
              nameEnglish: true,
              name: true,
              entityType: true,
            },
          },
          startYear: true,
          startMonth: true,
          startDay: true,
          endYear: true,
          endMonth: true,
          endDay: true,
          comment: true,
          References: true,
        },
      },
      GroupingMemberships: {
        where: { Groupings: { isHidden: false } },
        select: {
          groupingMemberId: true,
          Groupings: {
            select: {
              polpalId: true,
              nameShort: true,
              nameEnglish: true,
              name: true,
              entityType: true,
            },
          },
          startYear: true,
          startMonth: true,
          startDay: true,
          endYear: true,
          endMonth: true,
          endDay: true,
          comment: true,
          References: true,
        },
      },
      EntityNames: {
        select: {
          entityNameId: true,
          nameShort: true,
          name: true,
          language: true,
          startYear: true,
          startMonth: true,
          startDay: true,
          endYear: true,
          endMonth: true,
          endDay: true,
          comment: true,
          References: true,
        }
      },
      EntityChangeOld: {
        where: { EntityNew: { isHidden: false } },
        select: {
          entityChangeId: true,
          EntityNew: {
            select: {
              EntitiesInCountries: {
                select: {
                  countrycodePolpal: true,
                },
              },
              polpalId: true,
              nameShort: true,
              nameEnglish: true,
              name: true,
            }
          },
          changeYear: true,
          changeMonth: true,
          changeDay: true,
          changeType: true,
          comment: true,
          References: true,
        }
      },
      EntityChangeNew: {
        where: { EntityOld: { isHidden: false } },
        select: {
          entityChangeId: true,
          EntityOld: {
            select: {
              EntitiesInCountries: {
                select: {
                  countrycodePolpal: true,
                },
              },
              polpalId: true,
              nameShort: true,
              nameEnglish: true,
              name: true,
            }
          },
          changeYear: true,
          changeMonth: true,
          changeDay: true,
          changeType: true,
          comment: true,
          References: true,
        }
      },
    },
  });

  // Second query: intensity data for the bar chart (distinct dataset × year)
  const intensityPromise = prisma.entries.findMany({
    where: {
      LinksEntryToEntity: { some: { polpalId } },
      ...(!isAuthenticated ? { Projects: { isHidden: false }, Datasets: { isHidden: false } } : {}),
    },
    distinct: ['datasetKey', 'entryYear'],
    select: {
      Projects: { select: { projectNameShort: true } },
      Datasets: { select: { datasetNameShort: true } },
      entryYear: true,
    },
  });

  // Third query: distinct (dataset × version × entryEntityIdVar) for summary counts
  const summaryDistinctPromise = prisma.entries.findMany({
    where: {
      LinksEntryToEntity: { some: { polpalId } },
      ...(!isAuthenticated ? { Projects: { isHidden: false }, Datasets: { isHidden: false }, Versions: { isHidden: false } } : {}),
    },
    distinct: ['datasetKey', 'versionKey', 'entryEntityIdVar'],
    select: {
      datasetKey: true,
      entryEntityIdVar: true,
      Projects: { select: { projectKey: true, projectNameShort: true, projectName: true } },
      Datasets: { select: { datasetKey: true, datasetNameShort: true, datasetName: true } },
      Versions: { select: { versionKey: true, version: true } },
    },
  });

  // Fourth query: year range per dataset
  const yearRangesPromise = prisma.entries.groupBy({
    by: ['datasetKey'],
    where: {
      LinksEntryToEntity: { some: { polpalId } },
      entryYear: { not: null, lte: 2030 },
      ...(!isAuthenticated ? { Projects: { isHidden: false }, Datasets: { isHidden: false } } : {}),
    },
    _min: { entryYear: true },
    _max: { entryYear: true },
  });

  // Fifth query: distinct (datasetKey × entryEntityIdVar × entryEntityId) for ID value table
  const idValuesPromise = prisma.entries.findMany({
    where: {
      LinksEntryToEntity: { some: { polpalId } },
      ...(!isAuthenticated ? { Projects: { isHidden: false }, Datasets: { isHidden: false } } : {}),
    },
    distinct: ['datasetKey', 'entryEntityIdVar', 'entryEntityId'],
    select: {
      datasetKey: true,
      entryEntityIdVar: true,
      entryEntityId: true,
    },
  });

  // Sixth query: variable titles for all versions that contain entries linked to this entity
  const varTitlesPromise = prisma.variables.findMany({
    where: {
      Versions: {
        Entries: {
          some: {
            LinksEntryToEntity: { some: { polpalId } },
          },
        },
      },
    },
    select: {
      versionKey: true,
      entryEntityIdVar: true,
      varTitle: true,
      varContent: true,
    },
  });

  // Execute all queries in parallel
  const [entity, intensityEntries, summaryDistinct, yearRanges, idValuesRows, varTitleRows] = await Promise.all([
    entityPromise, intensityPromise, summaryDistinctPromise, yearRangesPromise, idValuesPromise, varTitlesPromise,
  ]);

  // Build ID values lookup: { [datasetKey]: { [varName]: Set<string> } }
  const idValuesMap: Record<string, Record<string, Set<string>>> = {};
  idValuesRows.forEach(e => {
    if (!e.entryEntityIdVar || !e.entryEntityId) return;
    if (!idValuesMap[e.datasetKey]) idValuesMap[e.datasetKey] = {};
    if (!idValuesMap[e.datasetKey][e.entryEntityIdVar]) idValuesMap[e.datasetKey][e.entryEntityIdVar] = new Set();
    idValuesMap[e.datasetKey][e.entryEntityIdVar].add(e.entryEntityId);
  });

  // Build var title/content lookup: { [versionKey]: { [varName]: { title, content } } }
  const varTitlesMap: Record<string, Record<string, { title: string; content: string }>> = {};
  varTitleRows.forEach(r => {
    if (!varTitlesMap[r.versionKey]) varTitlesMap[r.versionKey] = {};
    varTitlesMap[r.versionKey][r.entryEntityIdVar] = { title: r.varTitle, content: r.varContent };
  });

  // Build year-range lookup per dataset
  const yearRangeMap: Record<string, { first: number | null; last: number | null }> = {};
  yearRanges.forEach(y => {
    yearRangeMap[y.datasetKey] = { first: y._min.entryYear ?? null, last: y._max.entryYear ?? null };
  });

  // Build pre-aggregated summary per dataset
  const summaryMap: Record<string, {
    projectKey: string; projectNameShort: string; projectName: string;
    datasetKey: string; datasetNameShort: string; datasetName: string;
    versions: Map<string, string>; entryEntityIdVars: Set<string>;
  }> = {};
  summaryDistinct.forEach(entry => {
    const dk = entry.datasetKey;
    if (!summaryMap[dk]) {
      summaryMap[dk] = {
        projectKey: entry.Projects?.projectKey ?? '',
        projectNameShort: entry.Projects?.projectNameShort ?? '',
        projectName: entry.Projects?.projectName ?? '',
        datasetKey: entry.Datasets?.datasetKey ?? dk,
        datasetNameShort: entry.Datasets?.datasetNameShort ?? '',
        datasetName: entry.Datasets?.datasetName ?? '',
        versions: new Map<string, string>(),
        entryEntityIdVars: new Set(),
      };
    }
    if (entry.Versions?.version) summaryMap[dk].versions.set(entry.Versions.versionKey, entry.Versions.version);
    if (entry.entryEntityIdVar) summaryMap[dk].entryEntityIdVars.add(entry.entryEntityIdVar);
  });
  const entryDatasetSummary = Object.values(summaryMap).map(s => ({
    projectKey: s.projectKey,
    projectNameShort: s.projectNameShort,
    projectName: s.projectName,
    datasetKey: s.datasetKey,
    datasetNameShort: s.datasetNameShort,
    datasetName: s.datasetName,
    firstAppearanceYear: yearRangeMap[s.datasetKey]?.first ?? null,
    lastAppearanceYear: yearRangeMap[s.datasetKey]?.last ?? null,
    versions: Array.from(s.versions.entries()).map(([versionKey, version]) => ({
      versionKey,
      version,
      varTitles: varTitlesMap[versionKey] ?? {},
    })),
    entryEntityIdVars: Array.from(s.entryEntityIdVars).map(varName => ({
      varName,
      values: Array.from(idValuesMap[s.datasetKey]?.[varName] ?? new Set<string>()),
    })),
  }));

  // Combine the results
  return {
    isHidden: entity?.isHidden,
    isHiddenReason: entity?.isHiddenReason,
    polpalId: entity?.polpalId,
    partyfactsId: entity?.partyfactsId,
    nameShort: entity?.nameShort,
    nameEnglish: entity?.nameEnglish,
    name: entity?.name,
    entityType: entity?.entityType,
    wikidataId: entity?.wikidataId,
    wikipediaUrl: entity?.wikipediaUrl,
    logoUrl: entity?.logoUrl,
    comment: entity?.comment,
    References: entity?.References,
    EntitiesInCountries: entity?.EntitiesInCountries.map(e => ({
      countrycodePolpal: e.countrycodePolpal,
      countryname: e.Countries.countryname,
      iso2c: e.Countries.iso2c ?? null,
      region: e.Countries.region ?? null,
      comment: e.comment ?? null,
    })),
    GroupingMembers: entity?.GroupingMembers.map(gm => ({
      groupingMemberId: gm.groupingMemberId,
      polpalId: gm.Entities.polpalId,
      nameShort: gm.Entities.nameShort,
      nameEnglish: gm.Entities.nameEnglish,
      name: gm.Entities.name,
      entityType: gm.Entities.entityType,
      startYear: gm.startYear,
      startMonth: gm.startMonth,
      startDay: gm.startDay,
      endYear: gm.endYear,
      endMonth: gm.endMonth,
      endDay: gm.endDay,
      comment: gm.comment,
      References: gm.References,
    })),
    GroupingMemberships: entity?.GroupingMemberships.map(gm => ({
      groupingMemberId: gm.groupingMemberId,
      polpalId: gm.Groupings.polpalId,
      nameShort: gm.Groupings.nameShort,
      nameEnglish: gm.Groupings.nameEnglish,
      name: gm.Groupings.name,
      entityType: gm.Groupings.entityType,
      startYear: gm.startYear,
      startMonth: gm.startMonth,
      startDay: gm.startDay,
      endYear: gm.endYear,
      endMonth: gm.endMonth,
      endDay: gm.endDay,
      comment: gm.comment,
      References: gm.References,
    })),
    EntityNames: entity?.EntityNames.map(en => ({
      entityNameId: en.entityNameId,
      nameShort: en.nameShort,
      name: en.name,
      language: en.language,
      startYear: en.startYear,
      startMonth: en.startMonth,
      startDay: en.startDay,
      endYear: en.endYear,
      endMonth: en.endMonth,
      endDay: en.endDay,
      comment: en.comment,
      References: en.References,
    })),
    EntityChangeOld: entity?.EntityChangeOld.map(ec => ({
      entityChangeId: ec.entityChangeId,
      countrycodePolpal: ec.EntityNew.EntitiesInCountries.map(e => e.countrycodePolpal),
      polpalId: ec.EntityNew.polpalId,
      nameShort: ec.EntityNew.nameShort,
      nameEnglish: ec.EntityNew.nameEnglish,
      name: ec.EntityNew.name ?? null,
      changeYear: ec.changeYear,
      changeMonth: ec.changeMonth,
      changeDay: ec.changeDay,
      changeType: ec.changeType,
      comment: ec.comment,
      References: ec.References,
    })),
    EntityChangeNew: entity?.EntityChangeNew.map(ec => ({
      entityChangeId: ec.entityChangeId,
      countrycodePolpal: ec.EntityOld.EntitiesInCountries.map(e => e.countrycodePolpal),
      polpalId: ec.EntityOld.polpalId,
      nameShort: ec.EntityOld.nameShort,
      nameEnglish: ec.EntityOld.nameEnglish,
      name: ec.EntityOld.name ?? null,
      changeYear: ec.changeYear,
      changeMonth: ec.changeMonth,
      changeDay: ec.changeDay,
      changeType: ec.changeType,
      comment: ec.comment,
      References: ec.References,
    })),
    EntryIntensity: intensityEntries.map(e => ({
      projectNameShort: e.Projects?.projectNameShort ?? '',
      datasetNameShort: e.Datasets?.datasetNameShort ?? '',
      entryYear: e.entryYear,
    })),
    EntryDatasetSummary: entryDatasetSummary,
  };
  } catch (error) {
    logger.error({ err: error, polpalId }, 'getEntityByPolpalId failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// GET by polpalId and datasetKey
// ------------------------------------------------------------------------------

export async function getEntityDataset(polpalId: number, datasetKey: string) {
  try {
    return await prisma.entities.findUnique({
      where: {
        polpalId: polpalId,
      },
      include: {
        //Countries: true,
        LinksEntryToEntity: {
          where: {
            Entries: {
              datasetKey: datasetKey,
            },
          },
          select: {
            uniqueObservationId: true,
            polpalId: true,
            Entries: true,
          }
        },
      },
    });
  } catch (error) {
    logger.error({ err: error, polpalId, datasetKey }, 'getEntityDataset failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// GET ENTITIES WITHOUT COUNTRY ASSIGNMENT
// ------------------------------------------------------------------------------

export async function getEntitiesWithoutCountry() {
  try {
    return await prisma.entities.findMany({
      where: {
        EntitiesInCountries: {
          none: {},
        },
      },
      select: {
        polpalId: true,
        partyfactsId: true,
        nameShort: true,
        nameEnglish: true,
        name: true,
        entityType: true,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'getEntitiesWithoutCountry failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// GET UPDATE polpalId
// ------------------------------------------------------------------------------
export async function getUpdatePolpalId(polpalId: number) {
  try {
    // For now, just return basic entity info
    const entity = await prisma.entities.findUnique({
      where: { polpalId },
      select: {
        isHidden: true,
        isHiddenReason: true,
        polpalId: true,
        nameShort: true,
        nameEnglish: true,
        name: true,
        entityType: true,
        wikipediaUrl: true,
        wikidataId: true,
        comment: true,
        EntitiesInCountries: {
          select: {
            countrycodePolpal: true,
          },
        },
        _count: {
          select: {
            LinksEntryToEntity: true,
          },
        },
      },
    });
    if (!entity) {
      throw new Error("Entity not found");
    }
    const { _count, ...rest } = entity;
    return { ...rest, linkCount: _count.LinksEntryToEntity };
  } catch (error) {
    logger.error({ err: error, polpalId }, 'getUpdatePolpalId failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// GET UNKNOWN ENTITIES (for quality checks)
// ------------------------------------------------------------------------------

export async function getHiddenEntities() {
  try {
    return await prisma.entities.findMany({
      where: {
        isHidden: true,
      },
      select: {
        polpalId: true,
        isHiddenReason: true,
        nameShort: true,
        nameEnglish: true,
        name: true,
        entityType: true,
        wikipediaUrl: true,
        wikidataId: true,
        comment: true,
        EntitiesInCountries: {
          select: {
            countrycodePolpal: true,
            Countries: {
              select: {
                countryname: true,
                iso2c: true,
                region: true,
              },
            },
          },
        },
      },
      orderBy: { polpalId: 'asc' },
    });
  } catch (error) {
    logger.error({ err: error }, 'getHiddenEntities failed');
    throw error;
  }
}

export async function getCommentedEntities() {
  try {
    return await prisma.entities.findMany({
      where: {
        AND: [{ comment: { not: null } }, { comment: { not: '' } }],
      },
      select: {
        polpalId: true,
        isHidden: true,
        isHiddenReason: true,
        nameShort: true,
        nameEnglish: true,
        name: true,
        entityType: true,
        wikipediaUrl: true,
        wikidataId: true,
        comment: true,
        EntitiesInCountries: {
          select: {
            countrycodePolpal: true,
            Countries: {
              select: {
                countryname: true,
                iso2c: true,
                region: true,
              },
            },
          },
        },
      },
      orderBy: { polpalId: 'asc' },
    });
  } catch (error) {
    logger.error({ err: error }, 'getCommentedEntities failed');
    throw error;
  }
}

export async function getUnassignedEntities() {
  try {
    return await prisma.entities.findMany({
      where: {
        entityType: EntityTypesEnum.UNASSIGNED,
      },
      select: {
        polpalId: true,
        isHidden: true,
        isHiddenReason: true,
        nameShort: true,
        nameEnglish: true,
        name: true,
        entityType: true,
        wikipediaUrl: true,
        wikidataId: true,
        comment: true,
        color: true,
        EntityNames: {
          select: {
            nameShort: true,
            name: true,
            language: true,
            startYear: true,
            startMonth: true,
            startDay: true,
            endYear: true,
            endMonth: true,
            endDay: true,
          },
        },
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
    });
  } catch (error) {
    logger.error({ err: error }, 'getUnassignedEntities failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Wikidata / display cache helpers
// ------------------------------------------------------------------------------

export async function getEntitiesWithColors() {
  try {
    return await prisma.entities.findMany({
      where: { isHidden: false, color: { not: null } },
      select: { polpalId: true, nameShort: true, nameEnglish: true, color: true },
    });
  } catch (error) {
    logger.error({ err: error }, 'getEntitiesWithColors failed');
    throw error;
  }
}

export async function getEntitiesWithWikidataIds() {
  try {
    return await prisma.entities.findMany({
      where: { isHidden: false, wikidataId: { not: null } },
      select: { polpalId: true, nameShort: true, nameEnglish: true, wikidataId: true },
    });
  } catch (error) {
    logger.error({ err: error }, 'getEntitiesWithWikidataIds failed');
    throw error;
  }
}

export async function getCachedEntityLogo(wikidataId: string) {
  try {
    return await prisma.entities.findFirst({
      where: { wikidataId },
      select: { polpalId: true, logoUrl: true, logoUrlCachedAt: true, logoAttribution: true },
    });
  } catch (error) {
    logger.error({ err: error, wikidataId }, 'getCachedEntityLogo failed');
    throw error;
  }
}

export async function cacheEntityLogo(
  polpalId: number,
  logoUrl: string,
  logoAttribution: string | null,
) {
  try {
    return await prisma.entities.update({
      where: { polpalId },
      data: { logoUrl, logoAttribution, logoUrlCachedAt: new Date() },
    });
  } catch (error) {
    logger.error({ err: error, polpalId }, 'cacheEntityLogo failed');
    throw error;
  }
}

export async function getCachedEntityColor(wikidataId: string) {
  try {
    return await prisma.entities.findFirst({
      where: { wikidataId },
      select: { polpalId: true, color: true, colorCachedAt: true },
    });
  } catch (error) {
    logger.error({ err: error, wikidataId }, 'getCachedEntityColor failed');
    throw error;
  }
}

export async function cacheEntityColor(polpalId: number, color: string) {
  try {
    return await prisma.entities.update({
      where: { polpalId },
      data: { color, colorCachedAt: new Date() },
    });
  } catch (error) {
    logger.error({ err: error, polpalId }, 'cacheEntityColor failed');
    throw error;
  }
}