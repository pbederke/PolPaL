# Changelog Tracking Overview

This document lists every API route that writes to the `Changelog` table and the exact content each one records.

## How changelog logging works

Most mutations are logged through the `logChangelog()` helper in
[`src/lib/server/changelogLogger.ts`](../src/lib/server/changelogLogger.ts). A few high-volume
paths (bulk link creation, entity update) write to `prisma.changelog` directly for performance,
but the recorded shape is identical.

### Changelog record fields

| Field | Meaning |
|---|---|
| `tableName` | The `TableNamesEnum` value of the affected domain table |
| `recordId` | Primary key of the affected row |
| `recordName` | Human-readable label of the affected row |
| `action` | `CREATED` \| `UPDATED` \| `DELETED` |
| `field` | `__created__`, `__deleted__`, `__bulk__`, or the specific column name (for updates) |
| `oldValue` | Previous value — full JSON snapshot on delete, single value on update |
| `newValue` | New value — full JSON payload on create, single value on update |
| `comment` | Optional human note |
| `batchId` | UUID grouping all rows written by one operation |
| `bulk` | `true` for bulk operations (hidden from the standard admin changelog views) |
| `userId` | The acting user |

### Field conventions by action

- **CREATED** → `field = '__created__'`, `newValue = JSON.stringify(payload)`
- **DELETED** → `field = '__deleted__'`, `oldValue = JSON.stringify(record)`
- **UPDATED** → one row **per changed field**, `field = <column name>`, with `oldValue`/`newValue` holding that column's before/after values

---

## Entities — table `entities`

| Method | Route | Service | Action | field | recordName | Logged content |
|---|---|---|---|---|---|---|
| POST | `/api/entities` | `createEntity` | CREATED | `__created__` | `nameEnglish` | `newValue` = full entity payload · comment "Entity created" |
| PUT | `/api/entities/[polpalId]` | `updateEntity` | UPDATED | changed column | `nameEnglish` | one row per changed field with old/new value |
| DELETE | `/api/entities/[polpalId]` | `deleteEntity` | DELETED | `__deleted__` | `nameEnglish` | `oldValue` = full entity snapshot · comment "Entity deleted" |

## Countries — table `countries`

| Method | Route | Service | Action | field | recordName | Logged content |
|---|---|---|---|---|---|---|
| POST | `/api/countries` | `createCountry` | CREATED | `__created__` | `countryname` | `newValue` = country payload · comment "Country created" |
| PUT | `/api/countries/[countrycodePolpal]` | `updateCountry` | UPDATED | changed column | `countryname` | one row per changed field · comment "Country updated" |
| DELETE | `/api/countries/[countrycodePolpal]` | `deleteCountry` | DELETED | `__deleted__` | `countryname` | `oldValue` = full country snapshot · comment "Country deleted" |

## Entities in Countries — table `entitiesInCountries`

| Method | Route | Service | Action | field | recordName | Logged content |
|---|---|---|---|---|---|---|
| POST | `/api/entities-in-countries` | `createEntitiesInCountries` | CREATED | `__created__` | `{polpalId} in {countrycodePolpal}` | `newValue` = payload · comment "Entity in Country created" |
| DELETE | `/api/entities-in-countries/[entitiesInCountriesId]` | `deleteEntitiesInCountries` | DELETED | `__deleted__` | `{polpalId} in {countrycodePolpal}` | `oldValue` = snapshot · comment "Entity in Country deleted" |

## Grouping Members — table `groupingMembers`

| Method | Route | Service | Action | field | recordName | Logged content |
|---|---|---|---|---|---|---|
| POST | `/api/groupings/member` | `createGroupingMember` | CREATED | `__created__` | `{entity.nameEnglish} ({polpalId}) in {grouping.nameEnglish} ({polpalId})` | `newValue` = payload · comment "Grouping member created" |
| DELETE | `/api/groupings/member/[groupingMemberId]` | `deleteGroupingMember` | DELETED | `__deleted__` | same pattern | `oldValue` = snapshot · comment "Grouping member deleted" |

## Entity Changes — table `entityChanges`

| Method | Route | Service | Action | field | recordName | Logged content |
|---|---|---|---|---|---|---|
| POST | `/api/entity-changes` | `createEntityChange` | CREATED | `__created__` | `{old.nameEnglish} ({polpalId}) changed to {new.nameEnglish} ({polpalId})` | `newValue` = payload · comment "Entity change created" |
| DELETE | `/api/entity-changes/[entityChangeId]` | `deleteEntityChange` | DELETED | `__deleted__` | same pattern | `oldValue` = snapshot · comment "Entity change deleted" |

## Entity Names — table `entityNames`

| Method | Route | Service | Action | field | recordName | Logged content |
|---|---|---|---|---|---|---|
| POST | `/api/entity-names` | `createEntityName` | CREATED | `__created__` | `{name} ({polpalId})` | `newValue` = payload · comment "Entity name created" |
| DELETE | `/api/entity-names/[id]` | `deleteEntityName` | DELETED | `__deleted__` | `{name} ({polpalId})` | `oldValue` = snapshot · comment "Entity name deleted" |

## References — table `references`

| Method | Route | Service | Action | field | recordName | Logged content |
|---|---|---|---|---|---|---|
| POST | `/api/references` | `createReference` | CREATED | `__created__` | `value` | `newValue` = payload · comment "Reference created" |
| DELETE | `/api/references/[referenceId]` | `deleteReference` | DELETED | `__deleted__` | `value` | `oldValue` = snapshot · comment "Reference deleted" |

## Links — table `linksEntriesToEntities`

| Method | Route | Service | Action | field | recordName | Logged content |
|---|---|---|---|---|---|---|
| POST | `/api/links` | `createLink` | CREATED | `__created__` | `uniqueObservationId` | `newValue` = link payload · comment "Link created" |
| POST | `/api/links/by-entry-bulk` | `createLinksBulk` | CREATED | `__created__` | `uniqueObservationId` | one row per link · `newValue` = `{polpalId, uniqueObservationId}` · comment "Link created" · `bulk: true` |
| POST | `/api/links/auto-import` | `createAutoLinksBulk` | CREATED | `__created__` | `uniqueObservationId` | one row per link · `newValue` = `{polpalId, uniqueObservationId}` · comment "Auto-link from previous version" · `bulk: true` |
| DELETE | `/api/links/by-entry/[uniqueObservationId]` | `deleteLinkByEntry` | DELETED | `__deleted__` | `uniqueObservationId` | one row per link · `oldValue` = link snapshot · comment "Link deleted" |
| DELETE | `/api/links/by-entry-bulk` | `deleteLinkByEntryBulk` | DELETED | `__deleted__` | `uniqueObservationId` | one row per link · `oldValue` = link snapshot · comment "Link deleted" · `bulk: true` |
| DELETE | `/api/links/by-entries-polpal` | `deleteLinkByEntriesAndPolpalId` | DELETED | `__deleted__` | `uniqueObservationId` | one row per link · `oldValue` = link snapshot · comment "Link deleted" |

## Datasets — table `datasets`

| Method | Route | Service | Action | field | recordName | Logged content |
|---|---|---|---|---|---|---|
| POST | `/api/datasets` | `createDataset` | CREATED | `__created__` | `datasetName` | `newValue` = payload · comment "Dataset created" |
| PUT | `/api/datasets/[datasetKey]` | `updateDataset` | UPDATED | changed column | `datasetKey` | one row per changed field · comment "Dataset updated" |
| DELETE | `/api/datasets/[datasetKey]` | `deleteDataset` | DELETED | `__deleted__` | `datasetKey` | `oldValue` = snapshot · comment "Dataset deleted" |

## Projects — table `projects`

| Method | Route | Service | Action | field | recordName | Logged content |
|---|---|---|---|---|---|---|
| POST | `/api/projects` | `createProject` | CREATED | `__created__` | `projectKey` | `newValue` = payload · comment "Project created" |
| PUT | `/api/projects/[projectKey]` | `updateProject` | UPDATED | changed column | `projectKey` | one row per changed field (no comment) |
| DELETE | `/api/projects/[projectKey]` | `deleteProject` | DELETED | `__deleted__` | `projectKey` | `oldValue` = snapshot · comment "Project deleted" |

## Versions — table `versions`

| Method | Route | Service | Action | field | recordName | Logged content |
|---|---|---|---|---|---|---|
| POST | `/api/versions` | `createVersion` | CREATED | `__created__` | `versionKey` | `newValue` = payload · comment "Version created" |
| PUT | `/api/versions/[versionKey]` | `updateVersion` | UPDATED | changed column | `versionKey` | one row per changed field (no comment) |
| DELETE | `/api/versions/[versionKey]` | `deleteVersion` | DELETED | `__deleted__` | `versionKey` | `oldValue` = snapshot · comment "Version deleted" |

## Variables — table `variables`

| Method | Route | Service | Action | field | recordName | Logged content |
|---|---|---|---|---|---|---|
| POST | `/api/variables/[versionKey]` | `createVariable` | CREATED | `__created__` | `{versionKey}/{entryEntityIdVar}` | `newValue` = payload (no comment) |
| DELETE | `/api/variables/[versionKey]` | `deleteVariable` | DELETED | `__deleted__` | `{versionKey}/{entryEntityIdVar}` | (no comment) |

## News — table `news`

| Method | Route | Service | Action | field | recordName | Logged content |
|---|---|---|---|---|---|---|
| POST | `/api/news` | `createNews` | CREATED | `__created__` | `title` | `newValue` = payload · comment "News created" |
| PUT | `/api/news/[newsId]` | `updateNews` | UPDATED | changed column | `title` | one row per changed field (no comment) |
| DELETE | `/api/news/[newsId]` | `deleteNews` | DELETED | `__deleted__` | `title` | `oldValue` = snapshot · comment "News deleted" |

## Entries — table `entries`

Entry imports/syncs are logged as **summary rows** (not one row per entry).

| Method | Route | Service | Action | field | recordName | Logged content |
|---|---|---|---|---|---|---|
| POST | `/api/entries/import` | `importEntriesStreaming` | CREATED | `__created__` | `versionKey` | single upserted row · `newValue` = `"Entries imported for versionKey {versionKey}"` |
| POST | `/api/entries/sync` | `syncEntries` | CREATED / UPDATED / DELETED | `__bulk__` | `versionKey` | up to 3 rows · `newValue`/`oldValue` = `{versionKey, created\|updated\|deleted}` · comment "Sync: N entries created/updated/deleted" |

## Admin hard-deletes

Admin deletions go through `admin.service.ts` and record a `DELETED` row with
`field = '__deleted__'`, `oldValue` = full record snapshot, and a `"… deleted (admin)"` comment.

| Method | Route | Service | Table | recordName |
|---|---|---|---|---|
| DELETE | `/api/admin/references/[deleteReferenceId]` | `deleteReferenceAdmin` | `references` | `value` |
| DELETE | `/api/admin/projects/[projectKey]` | `deleteProjectAdmin` | `projects` | `projectKey` |
| DELETE | `/api/admin/datasets/[datasetKey]` | `deleteDatasetAdmin` | `datasets` | `datasetKey` |
| DELETE | `/api/admin/versions/[versionKey]` | `deleteVersionAdmin` | `versions` | `versionKey` |
| DELETE | `/api/admin/entity-names/[entityNameId]` | `deleteEntityNameAdmin` | `entityNames` | `{name} ({polpalId})` |
| DELETE | `/api/admin/entity-changes/[entityChangeId]` | `deleteEntityChangeAdmin` | `entityChanges` | `{old} changed to {new}` |
| DELETE | `/api/admin/entities-in-countries/[entityInCountryId]` | `deleteEntityInCountriesAdmin` | `entitiesInCountries` | `{polpalId} in {countrycodePolpal}` |
| DELETE | `/api/admin/grouping-members/[groupingMemberId]` | `deleteGroupingMemberAdmin` | `groupingMembers` | `{entity} in {grouping}` |
| DELETE | `/api/admin/link-entries-entities/[linkId]` | `deleteLinkEntryEntityAdmin` | `linksEntriesToEntities` | `uniqueObservationId` |

---

## Notes

- **Bulk rows** (`bulk: true`) are written by `createLinksBulk`, `createAutoLinksBulk`,
  `deleteLinkByEntryBulk`. The admin changelog views (`/admin/changelog/*`) filter on
  `bulk: false`, so these do not appear there by design.
- **Update rows** produce one changelog entry per changed column, all sharing a single `batchId`.
- **`batchId`** groups every row emitted by one operation, so a single multi-field update or a
  bulk link import can be reconstructed by grouping on it.
