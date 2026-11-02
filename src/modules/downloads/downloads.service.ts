import 'server-only';
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/prisma.server";

// Characters that trigger formula evaluation when a CSV cell is opened in a
// spreadsheet (Excel, Google Sheets, LibreOffice). A cell beginning with any of
// these is neutralized by prefixing a single quote so the value is always
// treated as inert text. See OWASP "CSV Injection".
const CSV_FORMULA_TRIGGERS = ["=", "+", "-", "@", "\t", "\r"];

// Serializes one value into a CSV cell: neutralizes spreadsheet formula
// injection for strings, then escapes embedded double quotes and wraps the
// cell in quotes. Non-string values are passed through unchanged.
function escapeCsvCell(val: unknown): unknown {
  if (typeof val !== "string") {
    return val;
  }
  const safe =
    val.length > 0 && CSV_FORMULA_TRIGGERS.includes(val[0]) ? `'${val}` : val;
  return `"${safe.replace(/"/g, '""')}"`;
}

// UTF-8 byte-order mark. Prepended to every CSV so spreadsheet apps (notably
// Excel) detect UTF-8 and render non-ASCII names (umlauts, accents, non-Latin
// scripts) correctly instead of falling back to the system locale.
const CSV_BOM = "\uFEFF";

// Roles that are allowed to download hidden data (hidden entities, hidden
// versions/projects/datasets). All other roles — including anonymous — are
// served only the public (non-hidden) subset of the dataset.
const HIDDEN_ACCESS_ROLES = new Set(["USER", "CONTRIBUTOR", "EDITOR", "DATAMANAGER", "ADMIN"]);

export function canDownloadHiddenContent(role?: string | null): boolean {
  return role != null && HIDDEN_ACCESS_ROLES.has(role);
}

// Streaming PolPaL Countries
export async function* streamDownloadCountries() {
  const BATCH_SIZE = 500;
  let skip = 0;

  const fields = [
    "countrycodePolpal",
    "isCountry",
    "countryname",
    "region",
    //"createdAt",
    //"updatedAt"
  ];

  // Yield CSV header (UTF-8 BOM so Excel reads non-ASCII correctly)
  yield CSV_BOM + fields.join(',') + '\n';

  while (true) {
    const countries = await prisma.countries.findMany({
      skip,
      take: BATCH_SIZE,
    });

    if (countries.length === 0) break;

    for (const country of countries) {
      const row = [
        country.countrycodePolpal || "",
        country.isCountry ? "true" : "false",
        country.countryname || "",
        country.region || "",
        //country.createdAt.toISOString(),
        //country.updatedAt.toISOString(),
      ];
      yield row.map(escapeCsvCell).join(',') + '\n';
    }

    skip += BATCH_SIZE;
  }
}

// Streaming PolPaL Entities
export interface EntityFilters {
  countries?: string[];  // array of countrycodePolpal values
  regions?: string[];    // array of region names
}

export async function getEntityFilters() {
  const [countryRows, regionRows] = await Promise.all([
    prisma.entitiesInCountries.findMany({
      select: {
        countrycodePolpal: true,
        Countries: { select: { countryname: true, region: true, iso2c: true } },
      },
      distinct: ['countrycodePolpal'],
      orderBy: { countrycodePolpal: 'asc' },
    }),
    prisma.countries.findMany({
      where: {
        EntitiesInCountries: { some: {} },
        region: { not: null },
      },
      select: { region: true },
      distinct: ['region'],
      orderBy: { region: 'asc' },
    }),
  ]);

  return {
    countries: countryRows.map(r => ({
      countrycodePolpal: r.countrycodePolpal,
      countryname: r.Countries?.countryname ?? r.countrycodePolpal,
      region: r.Countries?.region ?? null,
      iso2c: r.Countries?.iso2c ?? null,
    })),
    regions: regionRows.map(r => r.region as string),
  };
}

export async function* streamDownloadEntities(filters: EntityFilters = {}) {
  const BATCH_SIZE = 500;
  let skip = 0;

  const fields = [
    "polpalId",
    "nameShort",
    "nameEnglish",
    "name",
    "entityType",
    "wikipediaUrl",
    "wikidataId",
    "countries" // pipe-separated list of countrycodePolpal values,
  ];

  // Yield CSV header (UTF-8 BOM so Excel reads non-ASCII correctly)
  yield CSV_BOM + fields.join(',') + '\n';

  const where: Prisma.EntitiesWhereInput = {
    entityType: { notIn: ["INDEPENDENT", "RESIDUAL", "OTHERS", "UNKNOWN"] },
    isHidden: false,
  };
  if (filters.countries && filters.countries.length > 0) {
    where.EntitiesInCountries = { some: { countrycodePolpal: { in: filters.countries } } };
  } else if (filters.regions && filters.regions.length > 0) {
    where.EntitiesInCountries = { some: { Countries: { region: { in: filters.regions } } } };
  }

  while (true) {
    const entities = await prisma.entities.findMany({
      where,
      skip,
      take: BATCH_SIZE,
      include: {
        EntitiesInCountries: {
          select: { countrycodePolpal: true },
          orderBy: { countrycodePolpal: 'asc' },
        },
      },
    });

    if (entities.length === 0) break;

    for (const entity of entities) {
      const countryCodes = entity.EntitiesInCountries.map(e => e.countrycodePolpal).join('||');
      const row = [
        entity.polpalId || "",
        entity.nameShort || "",
        entity.nameEnglish || "",
        entity.name || "",
        entity.entityType || "",
        entity.wikipediaUrl || "",
        entity.wikidataId || "",
        countryCodes
      ];
      yield row.map(escapeCsvCell).join(',') + '\n';
    }

    skip += BATCH_SIZE;
  }
}


// Streaming PolPaL Groupings with Members
export async function getGroupingFilters() {
  const [countryRows, regionRows] = await Promise.all([
    prisma.entitiesInCountries.findMany({
      where: { Entities: { GroupingMemberships: { some: {} } } },
      select: {
        countrycodePolpal: true,
        Countries: { select: { countryname: true, region: true, iso2c: true } },
      },
      distinct: ['countrycodePolpal'],
      orderBy: { countrycodePolpal: 'asc' },
    }),
    prisma.countries.findMany({
      where: {
        EntitiesInCountries: { some: { Entities: { GroupingMemberships: { some: {} } } } },
        region: { not: null },
      },
      select: { region: true },
      distinct: ['region'],
      orderBy: { region: 'asc' },
    }),
  ]);

  return {
    countries: countryRows.map(r => ({
      countrycodePolpal: r.countrycodePolpal,
      countryname: r.Countries?.countryname ?? r.countrycodePolpal,
      region: r.Countries?.region ?? null,
      iso2c: r.Countries?.iso2c ?? null,
    })),
    regions: regionRows.map(r => r.region as string),
  };
}

export interface GroupingFilters {
  countries?: string[];
  regions?: string[];
}

export async function* streamDownloadGroupings(filters: GroupingFilters = {}) {
  const BATCH_SIZE = 500;
  let skip = 0;

  const fields = [
    "grouping_PolPaL_ID", "grouping_nameShort", "grouping_nameEnglish",
    "member_PolPaL_ID", "member_nameShort", "member_nameEnglish",
    "startYear", "startMonth", "startDay",
    "endYear", "endMonth", "endDay",
  ];

  // Yield CSV header (UTF-8 BOM so Excel reads non-ASCII correctly)
  yield CSV_BOM + fields.join(',') + '\n';

  const memberFilter: Prisma.EntitiesWhereInput =
    filters.countries && filters.countries.length > 0
      ? { EntitiesInCountries: { some: { countrycodePolpal: { in: filters.countries } } } }
      : filters.regions && filters.regions.length > 0
        ? { EntitiesInCountries: { some: { Countries: { region: { in: filters.regions } } } } }
        : {};

  const where: Prisma.GroupingMembersWhereInput = {
    Groupings: { entityType: "GROUPING", isHidden: false },
    Entities: { isHidden: false, ...memberFilter },
  };

  while (true) {
    const groupings = await prisma.groupingMembers.findMany({
      where,
      skip,
      take: BATCH_SIZE,
      select: {
        groupingMemberId: true,
        Groupings: {
          select: {
            polpalId: true,
            nameShort: true,
            nameEnglish: true,
          },
        },
        Entities: {
          select: {
            polpalId: true,
            nameShort: true,
            nameEnglish: true,
          },
        },
        startYear: true,
        startMonth: true,
        startDay: true,
        endYear: true,
        endMonth: true,
        endDay: true,
      },
    });

    if (groupings.length === 0) break;

    for (const grouping of groupings) {
      const row = [
        grouping.Groupings.polpalId || "",
        grouping.Groupings.nameShort || "",
        grouping.Groupings.nameEnglish || "",
        grouping.Entities.polpalId || "",
        grouping.Entities.nameShort || "",
        grouping.Entities.nameEnglish || "",
        grouping.startYear || "",
        grouping.startMonth || "",
        grouping.startDay || "",
        grouping.endYear || "",
        grouping.endMonth || "",
        grouping.endDay || "",
      ];
      yield row.map(escapeCsvCell).join(',') + '\n';
    }

    skip += BATCH_SIZE;
  }
}

// --- Filtered entry download support ---

export interface EntryFilters {
  countries?: string[];  // array of countrycodePolpal values
  regions?: string[];   // array of region names (continent level)
  yearFrom?: number;
  yearTo?: number;
  variables?: string[]; // array of entryEntityIdVar values
  short?: boolean;      // omit *Var columns and version metadata
  includeSpecialEntityLinks?: boolean; // when false, mask polpalId/names for UNKNOWN/RESIDUAL/OTHERS/INDEPENDENT links
}

export async function getEntryFiltersForVersion(versionKey: string) {
  const [countries, yearRange, regionRows, varRows] = await Promise.all([
    prisma.entries.findMany({
      where: { versionKey },
      select: {
        countrycodePolpal: true,
        Countries: { select: { countryname: true, region: true, iso2c: true } },
      },
      distinct: ['countrycodePolpal'],
      orderBy: { countrycodePolpal: 'asc' },
    }),
    prisma.entries.aggregate({
      where: { versionKey, entryYear: { not: null } },
      _min: { entryYear: true },
      _max: { entryYear: true },
    }),
    prisma.countries.findMany({
      where: {
        Entries: { some: { versionKey } },
        region: { not: null },
      },
      select: { region: true },
      distinct: ['region'],
      orderBy: { region: 'asc' },
    }),
    prisma.entries.findMany({
      where: { versionKey },
      select: { entryEntityIdVar: true },
      distinct: ['entryEntityIdVar'],
      orderBy: { entryEntityIdVar: 'asc' },
    }),
  ]);

  return {
    countries: countries.map(e => ({
      countrycodePolpal: e.countrycodePolpal,
      countryname: e.Countries?.countryname ?? e.countrycodePolpal,
      region: e.Countries?.region ?? null,
      iso2c: e.Countries?.iso2c ?? null,
    })),
    regions: regionRows.map(r => r.region as string),
    yearMin: yearRange._min.entryYear ?? null,
    yearMax: yearRange._max.entryYear ?? null,
    variables: varRows.map(r => r.entryEntityIdVar),
  };
}

// Streaming version for very large datasets
export async function* streamDownloadEntriesByVersion(versionKey: string, filters: EntryFilters = {}, allowHidden = false) {
  const BATCH_SIZE = 500;
  let skip = 0;

  const shortFields = [
    "countrycodePolpal",
    "entryEntityId",
    "entryEntityIdVar",
    "entryEntityNameShort",
    "entryEntityNameEnglish",
    "entryEntityName",
    "entryCountry",
    "entryYear",
    "entryMonth",
    "entryDay",
    "polpalId",
    "nameShort",
    "nameEnglish",
    "name",
    "entityType",
    "multipleLinks",
    "linkStartYear",
    "linkStartMonth",
    "linkStartDay",
    "linkEndYear",
    "linkEndMonth",
    "linkEndDay",
  ];

  const fullFields = [
    // Entry entity info
    "countrycodePolpal",
    "entryEntityId",
    "entryEntityIdVar",
    "entryEntityNameShort",
    "entryEntityNameShortVar",
    "entryEntityNameEnglish",
    "entryEntityNameEnglishVar",
    "entryEntityName",
    "entryEntityNameVar",
    // Entry info
    "entryCountry",
    "entryCountryVar",
    "entryYear",
    "entryYearVar",
    "entryMonth",
    "entryMonthVar",
    "entryDay",
    "entryDayVar",
    // PolPaL Entity
    "polpalId",
    "nameShort",
    "nameEnglish",
    "name",
    "entityType",
    "multipleLinks",
    "linkStartYear",
    "linkStartMonth",
    "linkStartDay",
    "linkEndYear",
    "linkEndMonth",
    "linkEndDay",
    // Version info
    "projectKey",
    "datasetKey",
    "versionKey",
    "dateDownloaded",
    "usedFile",
    // Unique observation ID
    "uniqueObservationId",
  ];

  const fields = filters.short ? shortFields : fullFields;

  // Yield CSV header (UTF-8 BOM so Excel reads non-ASCII correctly)
  yield CSV_BOM + fields.join(',') + '\n';

  const where: Prisma.EntriesWhereInput = {
    versionKey,
    ...(allowHidden ? {} : { Versions: { isHidden: false } }),
  };
  if (filters.countries && filters.countries.length > 0) {
    where.countrycodePolpal = { in: filters.countries };
  } else if (filters.regions && filters.regions.length > 0) {
    // Only apply region filter when no specific countries are selected
    where.Countries = { region: { in: filters.regions } };
  }
  if (filters.yearFrom != null || filters.yearTo != null) {
    where.entryYear = {
      ...(filters.yearFrom != null ? { gte: filters.yearFrom } : {}),
      ...(filters.yearTo != null ? { lte: filters.yearTo } : {}),
    };
  }
  if (filters.variables && filters.variables.length > 0) {
    where.entryEntityIdVar = { in: filters.variables };
  }

  while (true) {
    const entries = await prisma.entries.findMany({
      where,
      skip,
      take: BATCH_SIZE,
      select: {
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
        uniqueObservationId: true,
        countrycodePolpal: true,
        LinksEntryToEntity: {
          select: {
            polpalId: true,
            startYear: true,
            startMonth: true,
            startDay: true,
            endYear: true,
            endMonth: true,
            endDay: true,
            Entities: {
              select: {
                nameShort: true,
                nameEnglish: true,
                name: true,
                entityType: true
              }
            }
          }
        }
      }
    });

    if (entries.length === 0) break;

    for (const entry of entries) {
      const hasMultipleLinks = (entry.LinksEntryToEntity?.length || 0) > 1;
      const SPECIAL_ENTITY_TYPES = new Set(["UNKNOWN", "RESIDUAL", "OTHERS", "INDEPENDENT"]);

      if (entry.LinksEntryToEntity && entry.LinksEntryToEntity.length > 0) {
        for (const link of entry.LinksEntryToEntity) {
          const maskLink = filters.includeSpecialEntityLinks === false &&
            SPECIAL_ENTITY_TYPES.has(link.Entities?.entityType || "");
          const row = filters.short ? [
            entry.countrycodePolpal || "",
            entry.entryEntityId || "",
            entry.entryEntityIdVar || "",
            entry.entryEntityNameShort || "",
            entry.entryEntityNameEnglish || "",
            entry.entryEntityName || "",
            entry.entryCountry || "",
            entry.entryYear || "",
            entry.entryMonth || "",
            entry.entryDay || "",
            maskLink ? "" : (link.polpalId || ""),
            link.Entities?.nameShort || "",
            link.Entities?.nameEnglish || "",
            link.Entities?.name || "",
            link.Entities?.entityType || "",
            hasMultipleLinks,
            link.startYear || "",
            link.startMonth || "",
            link.startDay || "",
            link.endYear || "",
            link.endMonth || "",
            link.endDay || "",
          ] : [
            // Entry entity info
            entry.countrycodePolpal || "",
            entry.entryEntityId || "",
            entry.entryEntityIdVar || "",
            entry.entryEntityNameShort || "",
            entry.entryEntityNameShortVar || "",
            entry.entryEntityNameEnglish || "",
            entry.entryEntityNameEnglishVar || "",
            entry.entryEntityName || "",
            entry.entryEntityNameVar || "",
            // Entry info
            entry.entryCountry || "",
            entry.entryCountryVar || "",
            entry.entryYear || "",
            entry.entryYearVar || "",
            entry.entryMonth || "",
            entry.entryMonthVar || "",
            entry.entryDay || "",
            entry.entryDayVar || "",
            // PolPaL Entity info from link
            maskLink ? "" : (link.polpalId || ""),
            link.Entities?.nameShort || "",
            link.Entities?.nameEnglish || "",
            link.Entities?.name || "",
            link.Entities?.entityType || "",
            hasMultipleLinks,
            link.startYear || "",
            link.startMonth || "",
            link.startDay || "",
            link.endYear || "",
            link.endMonth || "",
            link.endDay || "",
            // Version info
            entry.projectKey || "",
            entry.datasetKey || "",
            entry.versionKey || "",
            entry.dateDownloaded || "",
            entry.usedFile || "",
            // Unique observation ID
            entry.uniqueObservationId || ""
          ];
          yield row.map(escapeCsvCell).join(',') + '\n';
        }
      } else {
        const row = filters.short ? [
          entry.countrycodePolpal || "",
          entry.entryEntityId || "",
          entry.entryEntityIdVar || "",
          entry.entryEntityNameShort || "",
          entry.entryEntityNameEnglish || "",
          entry.entryEntityName || "",
          entry.entryCountry || "",
          entry.entryYear || "",
          entry.entryMonth || "",
          entry.entryDay || "",
          "", "", "", "", "", "",
          "", "", "", "", "", "",
        ] : [
          // Entry entity info
          entry.countrycodePolpal || "",
          entry.entryEntityId || "",
          entry.entryEntityIdVar || "",
          entry.entryEntityNameShort || "",
          entry.entryEntityNameShortVar || "",
          entry.entryEntityNameEnglish || "",
          entry.entryEntityNameEnglishVar || "",
          entry.entryEntityName || "",
          entry.entryEntityNameVar || "",
          // Entry info
          entry.entryCountry || "",
          entry.entryCountryVar || "",
          entry.entryYear || "",
          entry.entryYearVar || "",
          entry.entryMonth || "",
          entry.entryMonthVar || "",
          entry.entryDay || "",
          entry.entryDayVar || "",
          // PolPaL Entity (empty since no link)
          "", "", "", "",
          "", "", "", "", "", "", "", "",
          // Version info
          entry.projectKey || "",
          entry.datasetKey || "",
          entry.versionKey || "",
          entry.dateDownloaded || "",
          entry.usedFile || "",
          // Unique observation ID
          entry.uniqueObservationId || "",
        ];
        yield row.map(escapeCsvCell).join(',') + '\n';
      }
    }

    skip += BATCH_SIZE;
  }
}

// Streaming PolPaL Projects / Datasets / Versions Overview
export async function* streamDownloadVersionsOverview(allowHidden = false) {
  const BATCH_SIZE = 500;
  let skip = 0;

  const fields = [
    "projectKey",
    "projectNameShort",
    "projectName",
    "projectUrl",
    "projectDescription",
    "datasetKey",
    "datasetNameShort",
    "datasetName",
    "datasetUrl",
    "datasetDescription",
    "versionKey",
    "version",
    "versionName",
    "versionUrl",
    "versionCitation",
  ];

  yield CSV_BOM + fields.join(',') + '\n';

  const where: Prisma.VersionsWhereInput = allowHidden
    ? {}
    : { isHidden: false, Projects: { isHidden: false }, Datasets: { isHidden: false } };

  while (true) {
    const versions = await prisma.versions.findMany({
      where,
      skip,
      take: BATCH_SIZE,
      orderBy: [
        { projectKey: 'asc' },
        { datasetKey: 'asc' },
        { versionKey: 'asc' },
      ],
      select: {
        versionKey: true,
        version: true,
        versionName: true,
        versionUrl: true,
        versionCitation: true,
        Projects: {
          select: {
            projectKey: true,
            projectNameShort: true,
            projectName: true,
            projectUrl: true,
            projectDescription: true,
          },
        },
        Datasets: {
          select: {
            datasetKey: true,
            datasetNameShort: true,
            datasetName: true,
            datasetUrl: true,
            datasetDescription: true,
          },
        },
      },
    });

    if (versions.length === 0) break;

    for (const v of versions) {
      const row = [
        v.Projects?.projectKey ?? "",
        v.Projects?.projectNameShort ?? "",
        v.Projects?.projectName ?? "",
        v.Projects?.projectUrl ?? "",
        v.Projects?.projectDescription ?? "",
        v.Datasets?.datasetKey ?? "",
        v.Datasets?.datasetNameShort ?? "",
        v.Datasets?.datasetName ?? "",
        v.Datasets?.datasetUrl ?? "",
        v.Datasets?.datasetDescription ?? "",
        v.versionKey,
        v.version,
        v.versionName ?? "",
        v.versionUrl,
        JSON.stringify(v.versionCitation),
      ];
      yield row.map(escapeCsvCell).join(',') + '\n';
    }

    skip += BATCH_SIZE;
  }
}

// Streaming PolPaL Entity Names
export interface EntityNameFilters {
  countries?: string[];
  regions?: string[];
}

export async function getEntityNameFilters() {
  const [countryRows, regionRows] = await Promise.all([
    prisma.entitiesInCountries.findMany({
      where: { Entities: { EntityNames: { some: {} } } },
      select: {
        countrycodePolpal: true,
        Countries: { select: { countryname: true, region: true, iso2c: true } },
      },
      distinct: ['countrycodePolpal'],
      orderBy: { countrycodePolpal: 'asc' },
    }),
    prisma.countries.findMany({
      where: {
        EntitiesInCountries: { some: { Entities: { EntityNames: { some: {} } } } },
        region: { not: null },
      },
      select: { region: true },
      distinct: ['region'],
      orderBy: { region: 'asc' },
    }),
  ]);

  return {
    countries: countryRows.map(r => ({
      countrycodePolpal: r.countrycodePolpal,
      countryname: r.Countries?.countryname ?? r.countrycodePolpal,
      region: r.Countries?.region ?? null,
      iso2c: r.Countries?.iso2c ?? null,
    })),
    regions: regionRows.map(r => r.region as string),
  };
}

export async function* streamDownloadEntityNames(filters: EntityNameFilters = {}) {
  const BATCH_SIZE = 500;
  let skip = 0;

  const fields = [
    "polpalId",
    "nameShort",
    "nameEnglish",
    "name",
    "entityType",
    "entityNameShort",
    "entityName",
    "language",
    "startYear",
    "startMonth",
    "startDay",
    "endYear",
    "endMonth",
    "endDay",
  ];

  yield CSV_BOM + fields.join(',') + '\n';

  const where: Prisma.EntityNamesWhereInput = {
    Entities: {
      isHidden: false,
      ...(filters.countries && filters.countries.length > 0
        ? { EntitiesInCountries: { some: { countrycodePolpal: { in: filters.countries } } } }
        : filters.regions && filters.regions.length > 0
          ? { EntitiesInCountries: { some: { Countries: { region: { in: filters.regions } } } } }
          : {}),
    },
  };

  while (true) {
    const entityNames = await prisma.entityNames.findMany({
      where,
      skip,
      take: BATCH_SIZE,
      orderBy: [
        { polpalId: 'asc' },
        { entityNameId: 'asc' },
      ],
      select: {
        polpalId: true,
        nameShort: true,
        name: true,
        language: true,
        startYear: true,
        startMonth: true,
        startDay: true,
        endYear: true,
        endMonth: true,
        endDay: true,
        Entities: {
          select: {
            nameShort: true,
            nameEnglish: true,
            name: true,
            entityType: true,
          },
        },
      },
    });

    if (entityNames.length === 0) break;

    for (const en of entityNames) {
      const row = [
        en.polpalId,
        en.Entities?.nameShort ?? "",
        en.Entities?.nameEnglish ?? "",
        en.Entities?.name ?? "",
        en.Entities?.entityType ?? "",
        en.nameShort,
        en.name,
        en.language,
        en.startYear ?? "",
        en.startMonth ?? "",
        en.startDay ?? "",
        en.endYear ?? "",
        en.endMonth ?? "",
        en.endDay ?? "",
      ];
      yield row.map(escapeCsvCell).join(',') + '\n';
    }

    skip += BATCH_SIZE;
  }
}