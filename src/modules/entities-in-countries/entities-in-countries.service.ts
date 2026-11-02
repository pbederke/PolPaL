import 'server-only';
import { ChangeActionEnum, TableNamesEnum } from "@/lib/shared/enums";
import { prisma } from "@/lib/server/prisma.server";
import logger from "@/lib/server/logger.server";
import { logChangelog } from "@/lib/server/changelogLogger";

// ------------------------------------------------------------------------------
// GET
// ------------------------------------------------------------------------------

export async function getEntitiesInCountries() {
  try {
    return await prisma.entitiesInCountries.findMany({
      where: {
        Entities: { isHidden: false },
      },
      select: {
        Entities: {
          select: {
            polpalId: true,
            partyfactsId: true,
            nameShort: true,
            nameEnglish: true,
            name: true,
            entityType: true,
            wikidataId: true,
            wikipediaUrl: true,
            EntityNames: {
              select: {
                nameShort: true,
                name: true,
              },
            },
          },
        },
        Countries: {
          select: {
            countryname: true,
            countrycodePolpal: true,
            iso2c: true,
            region: true,
          },
        },
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'getEntitiesInCountries failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// GET by polpalId
// ------------------------------------------------------------------------------

export async function getEntitiesInCountriesByPolpalId(polpalId: number) {
  try {
    return await prisma.entitiesInCountries.findMany({
      where: { polpalId: polpalId },
      select: {
        entityInCountryId: true,
        polpalId: true,
        countrycodePolpal: true,
        comment: true,
        Countries: {
          select: {
            countrycodePolpal: true,
            countryname: true,
            iso2c: true,
            region: true,
          },
        },
      },
    });
  } catch (error) {
    logger.error({ err: error, polpalId }, 'getEntitiesInCountriesByPolpalId failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// CREATE entity in country entry
// ------------------------------------------------------------------------------

export async function createEntitiesInCountries(
  userId: number,
  data: {
    polpalId: number;
    countrycodePolpal: string;
    comment?: string | null;
  },
) {
  try {
    const entity = await prisma.entities.findUnique({ where: { polpalId: data.polpalId } });
    const country = await prisma.countries.findUnique({ where: { countrycodePolpal: data.countrycodePolpal } });

    if (!entity) {
      throw new Error('Invalid polpalId');
    }
    if (!country) {
      throw new Error('Invalid countrycodePolpal');
    }

    const createdEntitiesInCountries = await prisma.entitiesInCountries.create({
      data: {
        polpalId: entity.polpalId,
        countrycodePolpal: country.countrycodePolpal,
        comment: data.comment ?? null,
        userId: userId,
      },
    });

    const batchId = crypto.randomUUID();

    // Create changelog entry for creation
    await logChangelog({
      tableName: TableNamesEnum.entitiesInCountries,
      recordId: createdEntitiesInCountries.entityInCountryId,
      recordName: `${createdEntitiesInCountries.polpalId} in ${createdEntitiesInCountries.countrycodePolpal}`,
      action: ChangeActionEnum.CREATED,
      field: '__created__',
      oldValue: undefined,
      newValue: JSON.stringify(data),
      comment: undefined,
      batchId: batchId,
      userId: userId,
    });

    return createdEntitiesInCountries;
  } catch (error) {
    logger.error({ err: error, polpalId: data.polpalId }, 'createEntitiesInCountries failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// DELETE entity in country entry
// ------------------------------------------------------------------------------

export async function deleteEntitiesInCountries(entityInCountryId: number, userId: number, comment?: string) {
  try {
    const existingEntitiesInCountries = await prisma.entitiesInCountries.findUnique({
      where: { entityInCountryId: entityInCountryId },
    });

    if (!existingEntitiesInCountries) {
      throw new Error("Entities in countries entry not found");
    }

    const batchId = crypto.randomUUID();

    // Create changelog entry for deletion before deleting
    await logChangelog({
      tableName: TableNamesEnum.entitiesInCountries,
      recordId: entityInCountryId,
      recordName: `${existingEntitiesInCountries.polpalId} in ${existingEntitiesInCountries.countrycodePolpal}`,
      action: ChangeActionEnum.DELETED,
      field: '__deleted__',
      oldValue: JSON.stringify(existingEntitiesInCountries),
      newValue: undefined,
      comment: comment ?? undefined,
      batchId: batchId,
      userId: userId,
    });

    await prisma.entitiesInCountries.delete({
      where: { entityInCountryId: entityInCountryId },
    });
  } catch (error) {
    logger.error({ err: error, entityInCountryId }, 'deleteEntitiesInCountries failed');
    throw error;
  }
}


// ------------------------------------------------------------------------------
// GET basic entity information by polpalId
// ------------------------------------------------------------------------------

export async function getEntityInfoByPolpalId(polpalId: number) {
  try {
    return await prisma.entities.findUnique({
      where: {
        polpalId: polpalId,
      },
      include: {
        EntitiesInCountries: {
          select: {
            entityInCountryId: true,
            countrycodePolpal: true,
            Countries: {
              select: {
                countrycodePolpal: true,
                countryname: true,
                iso2c: true,
                iso3c: true,
                region: true,
                regionSub: true,
              },
            },
          },
        },
      },
    });
  } catch (error) {
    logger.error({ err: error, polpalId }, 'getEntityInfoByPolpalId failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// GET entities of a country with detailed info
// ------------------------------------------------------------------------------

export async function getEntityInfosByCountrycode(countrycodePolpal: string) {
  try {
    return await prisma.entitiesInCountries.findMany({
      where: { countrycodePolpal: countrycodePolpal },
      select: {
        Entities: {
          select: {
            polpalId: true,
            nameShort: true,
            nameEnglish: true,
            name: true,
            entityType: true,
            LinksEntryToEntity: {
              select: {
                linkEntriesToEntityId: true,
                uniqueObservationId: true,
                polpalId: true,
                Entries: {
                  select: {
                    entryId: true,
                    datasetKey: true,
                    entryYear: true,
                  },
                },
              },
            },

          },
        },
        Countries: {
          select: {
            countryname: true,
            countrycodePolpal: true,
            iso2c: true,
            iso3c: true,
            iso3n: true,
            region: true,
            regionCode: true,
            regionSub: true,
            regionSubCode: true,
            regionIntermediate: true,
            regionIntermediateCode: true,
          },
        },
      },
    });
  } catch (error) {
    logger.error({ err: error, countrycodePolpal }, 'getEntityInfosByCountrycode failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// GET groupings for countries a entity is in by polpalId
// ------------------------------------------------------------------------------

export async function getGroupingsByPolpalId(polpalId: number) {
  try {
    return await prisma.entitiesInCountries.findMany({
      where: {
        polpalId: polpalId,
      },
      include: {
        Countries: {
          select: {
            countryname: true,
            countrycodePolpal: true,
            EntitiesInCountries: {
              where: {
                Entities: {
                  entityType: "GROUPING"
                }
              },
              select: {
                Entities: {
                  select: {
                    polpalId: true,
                    nameShort: true,
                    nameEnglish: true,
                    name: true,
                    entityType: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  } catch (error) {
    logger.error({ err: error, polpalId }, 'getGroupingsByPolpalId failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// GET entities for countries a entity is in by polpalId
// ------------------------------------------------------------------------------

export async function getEntitiesByPolpalId(polpalId: number) {
  try {
    return await prisma.entitiesInCountries.findMany({
      where: {
        polpalId: polpalId,
      },
      include: {
        Countries: {
          select: {
            countryname: true,
            countrycodePolpal: true,
            EntitiesInCountries: {
              select: {
                Entities: {
                  select: {
                    polpalId: true,
                    partyfactsId: true,
                    nameShort: true,
                    nameEnglish: true,
                    name: true,
                    entityType: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  } catch (error) {
    logger.error({ err: error, polpalId }, 'getEntitiesByPolpalId failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// GET all groupings in countries
// ------------------------------------------------------------------------------
export async function getGroupingsInCountries() {
  try {
    return await prisma.entitiesInCountries.findMany({
      where: {
        Entities: {
          entityType: "GROUPING",
          isHidden: false,
        },
      },
      select: {
        Entities: {
          select: {
            polpalId: true,
            partyfactsId: true,
            nameShort: true,
            nameEnglish: true,
            name: true,
            entityType: true,
            wikidataId: true,
            wikipediaUrl: true,
            EntityNames: {
              select: {
                nameShort: true,
                name: true,
              },
            },
          },
        },
        Countries: {
          select: {
            countryname: true,
            countrycodePolpal: true,
            iso2c: true,
            region: true,
          },
        },
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'getGroupingsInCountries failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// GET all entities in countries with entity information
// ------------------------------------------------------------------------------

export async function getEntitiesForLinking(countrycodePolpal: string, isLoggedIn = false) {
  try {
    const entitiesInCountries = await prisma.entitiesInCountries.findMany({
      where: {
        countrycodePolpal: countrycodePolpal,
        Entities: { isHidden: false },
      },
      select: {
        // Select Entity information
        Entities: {
          select: {
            // Select basic entity info
            polpalId: true,
            partyfactsId: true,
            nameShort: true,
            nameEnglish: true,
            name: true,
            entityType: true,
            wikipediaUrl: true,
            wikidataId: true,
            color: true,
            // Include all names for each entity, ordered by start date
            EntityNames: {
              select: {
                entityNameId: true,
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
              },
              // Order names by start date (oldest to newest)
              orderBy: [
                { startYear: 'asc' },
                { startMonth: 'asc' },
                { startDay: 'asc' },
              ],
            }
          },
        },
      },
    });

    if (entitiesInCountries.length === 0) {
      return [];
    }

    // Compute appearance/dataset aggregates using indexed IN lookups instead of
    // joining all Entries rows: fetch the links for these entities, then fetch
    // only the linked Entries (uniqueObservationId is a unique index).
    const polpalIds = entitiesInCountries.map(eic => eic.Entities.polpalId);
    const links = await prisma.linksEntryToEntity.findMany({
      where: {
        polpalId: { in: polpalIds },
      },
      select: {
        polpalId: true,
        uniqueObservationId: true,
      },
    });

    const uniqueObservationIds = links.map(l => l.uniqueObservationId);
    const entries = uniqueObservationIds.length > 0
      ? await prisma.entries.findMany({
          where: {
            uniqueObservationId: { in: uniqueObservationIds },
            ...(!isLoggedIn ? {
              Projects: { isHidden: false },
              Datasets: { isHidden: false },
              Versions: { isHidden: false },
            } : {}),
          },
          select: {
            uniqueObservationId: true,
            entryYear: true,
            datasetKey: true,
          },
        })
      : [];

    const entryByUniqueObservationId = new Map(
      entries.map(e => [e.uniqueObservationId, e])
    );

    const currentYear = new Date().getFullYear();
    type AppearanceAggregate = { first: number | null; last: number | null; datasets: Set<string> };
    const aggregatesByPolpalId = new Map<number, AppearanceAggregate>();
    for (const link of links) {
      const entry = entryByUniqueObservationId.get(link.uniqueObservationId);
      if (!entry) continue;

      let aggregate = aggregatesByPolpalId.get(link.polpalId);
      if (!aggregate) {
        aggregate = { first: null, last: null, datasets: new Set() };
        aggregatesByPolpalId.set(link.polpalId, aggregate);
      }

      if (entry.entryYear != null && entry.entryYear <= currentYear) {
        aggregate.first = aggregate.first === null ? entry.entryYear : Math.min(aggregate.first, entry.entryYear);
        aggregate.last = aggregate.last === null ? entry.entryYear : Math.max(aggregate.last, entry.entryYear);
      }
      if (entry.datasetKey) {
        aggregate.datasets.add(entry.datasetKey);
      }
    }

    const formattedEntitiesInCountries = entitiesInCountries.map(eic => {
      const aggregate = aggregatesByPolpalId.get(eic.Entities.polpalId);

      return {
        polpalId: eic.Entities.polpalId,
        partyfactsId: eic.Entities.partyfactsId ?? null,
        nameShort: eic.Entities.nameShort,
        nameEnglish: eic.Entities.nameEnglish,
        name: eic.Entities.name,
        entityType: eic.Entities.entityType,
        wikipediaUrl: eic.Entities.wikipediaUrl,
        wikidataId: eic.Entities.wikidataId,
        color: eic.Entities.color,
        EntityNames: eic.Entities.EntityNames,
        appearanceFirst: aggregate?.first ?? null,
        appearanceLast: aggregate?.last ?? null,
        datasetCount: aggregate?.datasets.size ?? 0,
      };
    });

    return formattedEntitiesInCountries;
  } catch (error) {
    logger.error({ err: error, countrycodePolpal }, 'getEntitiesForLinking failed');
    throw error;
  }
}