import 'server-only';
import { ChangeActionEnum, TableNamesEnum } from '@/lib/shared/enums';
import { prisma } from "@/lib/server/prisma.server";
import logger from "@/lib/server/logger.server";
import { logChangelog } from "@/lib/server/changelogLogger";
import { revalidateTag } from 'next/cache';
import { PROJECTS_CACHE_TAG } from "@/lib/shared/cache-tags";

// ------------------------------------------------------------------------------
// GET
// ------------------------------------------------------------------------------

export async function getCountries() {
  try {
    const countries = await prisma.countries.findMany()

    return countries
  } catch (error) {
    logger.error({ err: error }, 'getCountries failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// GET with Counts
// ------------------------------------------------------------------------------

export async function getCountriesWithCounts() {
  try {
    const [countries, partyCounts] = await Promise.all([
      prisma.countries.findMany({
        select: {
          countrycodePolpal: true,
          countryname: true,
          iso2c: true,
          region: true,
        },
      }),
      prisma.entitiesInCountries.findMany({
        where: {
          Entities: {
            entityType: {
              notIn: ["OTHERS", "INDEPENDENT", "RESIDUAL", "UNKNOWN"],
            },
          },
        },
        select: { countrycodePolpal: true },
      }),
    ]);

    // Create lookup maps for O(1) access
    const partyCountMap = new Map<string, number>();
    for (const { countrycodePolpal } of partyCounts) {
      partyCountMap.set(countrycodePolpal, (partyCountMap.get(countrycodePolpal) ?? 0) + 1);
    }

    return countries.map(country => ({
      ...country,
      entitiesCount: partyCountMap.get(country.countrycodePolpal) ?? 0,
    }));
  } catch (error) {
    logger.error({ err: error }, 'getCountriesWithCounts failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// GET by COUNTRYCODE
// ------------------------------------------------------------------------------

export async function getCountryByCountrycode(countrycodePolpal: string) {
  try {
    return await prisma.countries.findUnique({
      where: {
        countrycodePolpal: countrycodePolpal,
      },
    });
  } catch (error) {
    logger.error({ err: error, countrycodePolpal }, 'getCountryByCountrycode failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Create
// ------------------------------------------------------------------------------

export async function createCountry(
  data: {
    countrycodePolpal: string;
    isCountry: boolean;
    iso2c?: string | null;
    iso3c?: string | null;
    iso3n?: number | null;
    countryname: string;
    region?: string | null;
    regionCode?: number | null;
    regionSub?: string | null;
    regionSubCode?: number | null;
    regionIntermediate?: string | null;
    regionIntermediateCode?: number | null;
  },
  userId: number
) {
  try {
    const createdCountry = await prisma.countries.create({
      data: {
        ...data,
        userId: userId,
      },
    });

    const batchId = crypto.randomUUID();

    // Create changelog entry for creation
    await logChangelog({
      tableName: TableNamesEnum.countries,
      recordId: createdCountry.countryId,
      recordName: createdCountry.countryname,
      action: ChangeActionEnum.CREATED,
      field: '__created__',
      oldValue: undefined,
      newValue: JSON.stringify(data),
      comment: undefined,
      batchId: batchId,
      userId: userId,
    });

    // Link the entities with entityType INDEPENDENT, OTHERS, RESIDUAL, UNKNOWN to this country
    const worldEntities = await prisma.entities.findMany({
      where: { entityType: { in: ["INDEPENDENT", "OTHERS", "RESIDUAL", "UNKNOWN"] } },
      select: { polpalId: true },
    });

    if (worldEntities.length > 0) {
      await prisma.entitiesInCountries.createMany({
        data: worldEntities.map(({ polpalId }) => ({
          polpalId,
          countrycodePolpal: createdCountry.countrycodePolpal,
          userId,
        })),
        skipDuplicates: true,
      });
    }

    revalidateTag(PROJECTS_CACHE_TAG, { expire: 0 });
    return createdCountry;
  } catch (error) {
    logger.error({ err: error, countrycodePolpal: data.countrycodePolpal }, 'createCountry failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Update
// ------------------------------------------------------------------------------

export async function updateCountry(
  userId: number,
  role: string,
  countrycodePolpal: string,
  data: Partial<{
    isCountry: boolean;
    iso2c: string | null | undefined;
    iso3c: string | null | undefined;
    iso3n: number | null | undefined;
    countryname: string;
    region: string | null | undefined;
    regionCode: number | null | undefined;
    regionSub: string | null | undefined;
    regionSubCode: number | null | undefined;
    regionIntermediate: string | null | undefined;
    regionIntermediateCode: number | null | undefined;
  }>,

) {
  try {
    const existingCountry = await prisma.countries.findUnique({
      where: { countrycodePolpal }
    });

    if (!existingCountry) {
      throw new Error("Country not found")
    }

    const isAdmin = role === "ADMIN";
    const isDatamanager = role === "DATAMANAGER";
    const isEditor = role === "EDITOR";

    if (!isAdmin && !isDatamanager && !isEditor) {
      throw new Error("Unauthorized to update this PolPaL country");
    }

    // Compare changes
    const changedFields: {
      field: string;
      oldValue: string | undefined;
      newValue: string | undefined;
    }[] = [];

    for (const key in data) {
      const oldVal = (existingCountry as Record<string, unknown>)[key];
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
      return existingCountry;
    }

    const batchId = crypto.randomUUID();

    // Perform update + create changelog entries atomically
    const updatedCountry = await prisma.$transaction(async (tx) => {
      const country = await tx.countries.update({
        where: { countrycodePolpal },
        data: {
          ...data,
        },
      });

      for (const change of changedFields) {
        await logChangelog({
          tableName: TableNamesEnum.countries,
          recordId: existingCountry.countryId,
          recordName: existingCountry.countryname,
          action: ChangeActionEnum.UPDATED,
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
          comment: undefined,
          batchId: batchId,
          userId: userId,
        });
      }

      return country;
    });

    revalidateTag(PROJECTS_CACHE_TAG, { expire: 0 });
    return updatedCountry;
  } catch (error) {
    logger.error({ err: error, countrycodePolpal }, 'updateCountry failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// DELETE
// ------------------------------------------------------------------------------

export async function deleteCountry(countrycodePolpal: string, userId: number, role: string, comment?: string) {
  try {
    const existingCountry = await prisma.countries.findUnique({
      where: { countrycodePolpal },
    });

    if (!existingCountry) {
      throw new Error("Country not found");
    }

    const isAdmin = role === "ADMIN";
    const isDatamanager = role === "DATAMANAGER";

    if (!isAdmin && !isDatamanager) {
      throw new Error("Unauthorized to delete this country");
    }

    const batchId = crypto.randomUUID();

    await logChangelog({
      tableName: TableNamesEnum.countries,
      recordId: existingCountry.countryId,
      recordName: existingCountry.countryname,
      action: ChangeActionEnum.DELETED,
      field: '__deleted__',
      oldValue: JSON.stringify(existingCountry),
      newValue: undefined,
      comment: comment?.trim() || undefined,
      batchId: batchId,
      userId: userId,
    });

    revalidateTag(PROJECTS_CACHE_TAG, { expire: 0 });
    return await prisma.countries.delete({
      where: { countryId: existingCountry.countryId },
    });
  } catch (error) {
    logger.error({ err: error, countrycodePolpal }, 'deleteCountry failed');
    throw error;
  }
}