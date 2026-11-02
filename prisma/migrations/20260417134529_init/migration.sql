-- CreateEnum
CREATE TYPE "TableNameAboutEnum" AS ENUM ('member', 'student', 'contribution', 'grants', 'support');

-- CreateEnum
CREATE TYPE "TableNamesEnum" AS ENUM ('countries', 'entities', 'individuals', 'groupingMembers', 'entitiesInCountries', 'entityChanges', 'entityNames', 'individualsInCountries', 'individualsInEntities', 'linksEntriesToEntities', 'entries', 'versions', 'datasets', 'projects', 'news', 'users', 'references');

-- CreateEnum
CREATE TYPE "ChangeActionEnum" AS ENUM ('CREATED', 'UPDATED', 'DELETED');

-- CreateEnum
CREATE TYPE "EntityTypesEnum" AS ENUM ('PARTY', 'GROUPING', 'INDEPENDENT', 'OTHERS', 'RESIDUAL', 'UNKNOWN', 'UNASSIGNED');

-- CreateEnum
CREATE TYPE "EntityChangesEnum" AS ENUM ('SPLIT', 'MERGE', 'SPLIT_MERGE', 'REBRAND', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "LanguageCodeEnum" AS ENUM ('aa', 'ab', 'ae', 'af', 'ak', 'am', 'an', 'ar', 'as', 'av', 'ay', 'az', 'ba', 'be', 'bg', 'bi', 'bm', 'bn', 'bo', 'br', 'bs', 'ca', 'ce', 'ch', 'co', 'cr', 'cs', 'cu', 'cv', 'cy', 'da', 'de', 'dv', 'dz', 'ee', 'el', 'en', 'eo', 'es', 'et', 'eu', 'fa', 'ff', 'fi', 'fj', 'fo', 'fr', 'fy', 'ga', 'gd', 'gl', 'gn', 'gu', 'gv', 'ha', 'he', 'hi', 'ho', 'hr', 'ht', 'hu', 'hy', 'hz', 'ia', 'id', 'ie', 'ig', 'ii', 'ik', 'io', 'is', 'it', 'iu', 'ja', 'jv', 'ka', 'kg', 'ki', 'kj', 'kk', 'kl', 'km', 'kn', 'ko', 'kr', 'ks', 'ku', 'kv', 'kw', 'ky', 'la', 'lb', 'lg', 'li', 'ln', 'lo', 'lt', 'lu', 'lv', 'mg', 'mh', 'mi', 'mk', 'ml', 'mn', 'mr', 'ms', 'mt', 'my', 'na', 'nb', 'nd', 'ne', 'ng', 'nl', 'nn', 'no', 'nr', 'nv', 'ny', 'oc', 'oj', 'om', 'or', 'os', 'pa', 'pi', 'pl', 'ps', 'pt', 'qu', 'rm', 'rn', 'ro', 'ru', 'rw', 'sa', 'sc', 'sd', 'se', 'sg', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'ss', 'st', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tl', 'tn', 'to', 'tr', 'ts', 'tt', 'tw', 'ty', 'ug', 'uk', 'ur', 'uz', 've', 'vi', 'vo', 'wa', 'wo', 'xh', 'yi', 'yo', 'za', 'zh', 'zu');

-- CreateEnum
CREATE TYPE "GenderEnum" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ReferenceTypeEnum" AS ENUM ('Website', 'Wikipedia', 'Literature', 'Document', 'Database', 'News', 'Other');

-- CreateEnum
CREATE TYPE "RoleEnum" AS ENUM ('ADMIN', 'DATAMANAGER', 'EDITOR', 'CONTRIBUTOR', 'USER', 'ROBOT');

-- CreateEnum
CREATE TYPE "ValidationEnum" AS ENUM ('APPROVED', 'REJECTED', 'NONE');

-- CreateTable
CREATE TABLE "About" (
    "id" SERIAL NOT NULL,
    "tableName" "TableNameAboutEnum" NOT NULL,
    "name" TEXT,
    "affiliation" TEXT,
    "time" TEXT,
    "url" TEXT,
    "funding" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "About_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Changelog" (
    "changelogId" SERIAL NOT NULL,
    "tableName" "TableNamesEnum" NOT NULL,
    "recordId" INTEGER NOT NULL,
    "recordName" TEXT NOT NULL,
    "action" "ChangeActionEnum" NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "comment" TEXT,
    "batchId" TEXT,
    "bulk" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Changelog_pkey" PRIMARY KEY ("changelogId")
);

-- CreateTable
CREATE TABLE "Countries" (
    "countryId" SERIAL NOT NULL,
    "isCountry" BOOLEAN NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "isHiddenReason" TEXT,
    "countrycodePolpal" TEXT NOT NULL,
    "iso2c" TEXT,
    "iso3c" TEXT,
    "iso3n" INTEGER,
    "countryname" TEXT NOT NULL,
    "countrycodeRPackage" TEXT,
    "region" TEXT,
    "regionCode" INTEGER,
    "regionSub" TEXT,
    "regionSubCode" INTEGER,
    "regionIntermediate" TEXT,
    "regionIntermediateCode" INTEGER,
    "wikidataId" TEXT,
    "wikipediaUrl" TEXT,
    "comment" TEXT,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Countries_pkey" PRIMARY KEY ("countryId")
);

-- CreateTable
CREATE TABLE "Datasets" (
    "datasetId" SERIAL NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT true,
    "isHiddenReason" TEXT,
    "projectKey" TEXT NOT NULL,
    "datasetKey" TEXT NOT NULL,
    "datasetNameShort" TEXT NOT NULL,
    "datasetName" TEXT NOT NULL,
    "datasetUrl" TEXT,
    "datasetDescription" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "Datasets_pkey" PRIMARY KEY ("datasetId")
);

-- CreateTable
CREATE TABLE "EntitiesInCountries" (
    "entityInCountryId" SERIAL NOT NULL,
    "polpalId" INTEGER NOT NULL,
    "countrycodePolpal" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "EntitiesInCountries_pkey" PRIMARY KEY ("entityInCountryId")
);

-- CreateTable
CREATE TABLE "Entities" (
    "polpalId" SERIAL NOT NULL,
    "partyfactsId" INTEGER,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "isHiddenReason" TEXT,
    "nameShort" TEXT NOT NULL,
    "nameEnglish" TEXT NOT NULL,
    "name" TEXT,
    "entityType" "EntityTypesEnum" NOT NULL,
    "wikipediaUrl" TEXT,
    "wikidataId" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "Entities_pkey" PRIMARY KEY ("polpalId")
);

-- CreateTable
CREATE TABLE "EntityChanges" (
    "entityChangeId" SERIAL NOT NULL,
    "polpalIdOld" INTEGER NOT NULL,
    "polpalIdNew" INTEGER NOT NULL,
    "changeYear" INTEGER NOT NULL,
    "changeMonth" INTEGER,
    "changeDay" INTEGER,
    "changeType" "EntityChangesEnum" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "EntityChanges_pkey" PRIMARY KEY ("entityChangeId")
);

-- CreateTable
CREATE TABLE "EntityNames" (
    "entityNameId" SERIAL NOT NULL,
    "polpalId" INTEGER NOT NULL,
    "nameShort" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" "LanguageCodeEnum" NOT NULL,
    "comment" TEXT,
    "startYear" INTEGER,
    "startMonth" INTEGER,
    "startDay" INTEGER,
    "endYear" INTEGER,
    "endMonth" INTEGER,
    "endDay" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "EntityNames_pkey" PRIMARY KEY ("entityNameId")
);

-- CreateTable
CREATE TABLE "Entries" (
    "entryId" SERIAL NOT NULL,
    "usedFile" TEXT NOT NULL,
    "dateDownloaded" TEXT NOT NULL,
    "projectKey" TEXT NOT NULL,
    "datasetKey" TEXT NOT NULL,
    "versionKey" TEXT NOT NULL,
    "entryCountryVar" TEXT,
    "entryCountry" TEXT,
    "entryYearVar" TEXT,
    "entryYear" INTEGER,
    "entryMonthVar" TEXT,
    "entryMonth" INTEGER,
    "entryDayVar" TEXT,
    "entryDay" INTEGER,
    "entryEntityIdVar" TEXT NOT NULL,
    "entryEntityId" TEXT NOT NULL,
    "entryEntityNameShortVar" TEXT,
    "entryEntityNameShort" TEXT,
    "entryEntityNameEnglishVar" TEXT,
    "entryEntityNameEnglish" TEXT,
    "entryEntityNameVar" TEXT,
    "entryEntityName" TEXT,
    "additionalInformation" TEXT,
    "countrycodePolpal" TEXT NOT NULL,
    "uniqueObservationId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "Entries_pkey" PRIMARY KEY ("entryId")
);

-- CreateTable
CREATE TABLE "GroupingMembers" (
    "groupingMemberId" SERIAL NOT NULL,
    "entityId" INTEGER NOT NULL,
    "groupingId" INTEGER NOT NULL,
    "startYear" INTEGER,
    "startMonth" INTEGER,
    "startDay" INTEGER,
    "endYear" INTEGER,
    "endMonth" INTEGER,
    "endDay" INTEGER,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "GroupingMembers_pkey" PRIMARY KEY ("groupingMemberId")
);

-- CreateTable
CREATE TABLE "IndividualsInCountries" (
    "individualInCountryId" SERIAL NOT NULL,
    "individualId" INTEGER NOT NULL,
    "countrycodePolpal" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "IndividualsInCountries_pkey" PRIMARY KEY ("individualInCountryId")
);

-- CreateTable
CREATE TABLE "IndividualsInEntities" (
    "individualInEntityId" SERIAL NOT NULL,
    "individualId" INTEGER NOT NULL,
    "polpalId" INTEGER NOT NULL,
    "startYear" INTEGER,
    "startMonth" INTEGER,
    "startDay" INTEGER,
    "endYear" INTEGER,
    "endMonth" INTEGER,
    "endDay" INTEGER,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "IndividualsInEntities_pkey" PRIMARY KEY ("individualInEntityId")
);

-- CreateTable
CREATE TABLE "Individuals" (
    "individualId" SERIAL NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "isHiddenReason" TEXT,
    "nameFirst" TEXT NOT NULL,
    "nameLast" TEXT NOT NULL,
    "gender" "GenderEnum" NOT NULL,
    "birthYear" INTEGER,
    "birthMonth" INTEGER,
    "birthDay" INTEGER,
    "deathYear" INTEGER,
    "deathMonth" INTEGER,
    "deathDay" INTEGER,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "Individuals_pkey" PRIMARY KEY ("individualId")
);

-- CreateTable
CREATE TABLE "LinksEntryToEntity" (
    "linkEntriesToEntityId" SERIAL NOT NULL,
    "uniqueObservationId" TEXT NOT NULL,
    "polpalId" INTEGER NOT NULL,
    "startYear" INTEGER,
    "startMonth" INTEGER,
    "startDay" INTEGER,
    "endYear" INTEGER,
    "endMonth" INTEGER,
    "endDay" INTEGER,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "LinksEntryToEntity_pkey" PRIMARY KEY ("linkEntriesToEntityId")
);

-- CreateTable
CREATE TABLE "News" (
    "newsId" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "links" JSONB,
    "publishedPublicAt" TIMESTAMP(3) NOT NULL,
    "updatedPublicAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "News_pkey" PRIMARY KEY ("newsId")
);

-- CreateTable
CREATE TABLE "Projects" (
    "projectId" SERIAL NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT true,
    "isHiddenReason" TEXT,
    "projectKey" TEXT NOT NULL,
    "projectNameShort" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "projectUrl" TEXT,
    "projectDescription" TEXT,
    "comment" TEXT,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Projects_pkey" PRIMARY KEY ("projectId")
);

-- CreateTable
CREATE TABLE "References" (
    "referenceId" SERIAL NOT NULL,
    "countrycodePolpal" TEXT,
    "polpalId" INTEGER,
    "entitiesInCountriesId" INTEGER,
    "entityChangeId" INTEGER,
    "entityNameId" INTEGER,
    "groupingMemberId" INTEGER,
    "individualId" INTEGER,
    "individualCountryId" INTEGER,
    "individualEntityId" INTEGER,
    "projectKey" TEXT,
    "datasetKey" TEXT,
    "versionKey" TEXT,
    "referencedField" TEXT,
    "type" "ReferenceTypeEnum" NOT NULL,
    "value" TEXT NOT NULL,
    "language" "LanguageCodeEnum",
    "accessedAt" TIMESTAMP(3),
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "References_pkey" PRIMARY KEY ("referenceId")
);

-- CreateTable
CREATE TABLE "Users" (
    "userId" SERIAL NOT NULL,
    "nameFirst" TEXT NOT NULL,
    "nameLast" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifyToken" TEXT,
    "emailVerifyExpiresAt" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "passwordResetExpiresAt" TIMESTAMP(3),
    "approvedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "role" "RoleEnum" NOT NULL DEFAULT 'USER',
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ValidationLinks" (
    "validationId" SERIAL NOT NULL,
    "linkId" INTEGER NOT NULL,
    "userId" INTEGER,
    "validated" "ValidationEnum" NOT NULL DEFAULT 'NONE',
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValidationLinks_pkey" PRIMARY KEY ("validationId")
);

-- CreateTable
CREATE TABLE "Versions" (
    "versionId" SERIAL NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT true,
    "isHiddenReason" TEXT,
    "projectKey" TEXT NOT NULL,
    "datasetKey" TEXT NOT NULL,
    "versionKey" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "versionName" TEXT,
    "versionUrl" TEXT NOT NULL,
    "versionCitation" JSONB NOT NULL,
    "commentVersion" TEXT,
    "commentEntries" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "Versions_pkey" PRIMARY KEY ("versionId")
);

-- CreateIndex
CREATE INDEX "Changelog_tableName_recordId_idx" ON "Changelog"("tableName", "recordId");

-- CreateIndex
CREATE INDEX "Changelog_action_idx" ON "Changelog"("action");

-- CreateIndex
CREATE INDEX "Changelog_userId_idx" ON "Changelog"("userId");

-- CreateIndex
CREATE INDEX "Changelog_batchId_idx" ON "Changelog"("batchId");

-- CreateIndex
CREATE INDEX "Changelog_changedAt_idx" ON "Changelog"("changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Countries_countrycodePolpal_key" ON "Countries"("countrycodePolpal");

-- CreateIndex
CREATE INDEX "Countries_countrycodePolpal_idx" ON "Countries"("countrycodePolpal");

-- CreateIndex
CREATE INDEX "Countries_userId_idx" ON "Countries"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Datasets_datasetKey_key" ON "Datasets"("datasetKey");

-- CreateIndex
CREATE INDEX "Datasets_projectKey_idx" ON "Datasets"("projectKey");

-- CreateIndex
CREATE INDEX "Datasets_userId_idx" ON "Datasets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Datasets_projectKey_datasetKey_key" ON "Datasets"("projectKey", "datasetKey");

-- CreateIndex
CREATE INDEX "EntitiesInCountries_countrycodePolpal_idx" ON "EntitiesInCountries"("countrycodePolpal");

-- CreateIndex
CREATE INDEX "EntitiesInCountries_polpalId_idx" ON "EntitiesInCountries"("polpalId");

-- CreateIndex
CREATE INDEX "EntitiesInCountries_userId_idx" ON "EntitiesInCountries"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EntitiesInCountries_polpalId_countrycodePolpal_key" ON "EntitiesInCountries"("polpalId", "countrycodePolpal");

-- CreateIndex
CREATE INDEX "Entities_entityType_idx" ON "Entities"("entityType");

-- CreateIndex
CREATE INDEX "Entities_userId_idx" ON "Entities"("userId");

-- CreateIndex
CREATE INDEX "EntityChanges_polpalIdOld_idx" ON "EntityChanges"("polpalIdOld");

-- CreateIndex
CREATE INDEX "EntityChanges_polpalIdNew_idx" ON "EntityChanges"("polpalIdNew");

-- CreateIndex
CREATE INDEX "EntityChanges_userId_idx" ON "EntityChanges"("userId");

-- CreateIndex
CREATE INDEX "EntityNames_polpalId_idx" ON "EntityNames"("polpalId");

-- CreateIndex
CREATE INDEX "EntityNames_userId_idx" ON "EntityNames"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Entries_uniqueObservationId_key" ON "Entries"("uniqueObservationId");

-- CreateIndex
CREATE INDEX "Entries_versionKey_countrycodePolpal_idx" ON "Entries"("versionKey", "countrycodePolpal");

-- CreateIndex
CREATE INDEX "Entries_datasetKey_idx" ON "Entries"("datasetKey");

-- CreateIndex
CREATE INDEX "Entries_projectKey_idx" ON "Entries"("projectKey");

-- CreateIndex
CREATE INDEX "Entries_countrycodePolpal_idx" ON "Entries"("countrycodePolpal");

-- CreateIndex
CREATE INDEX "Entries_userId_idx" ON "Entries"("userId");

-- CreateIndex
CREATE INDEX "GroupingMembers_entityId_idx" ON "GroupingMembers"("entityId");

-- CreateIndex
CREATE INDEX "GroupingMembers_groupingId_idx" ON "GroupingMembers"("groupingId");

-- CreateIndex
CREATE INDEX "GroupingMembers_userId_idx" ON "GroupingMembers"("userId");

-- CreateIndex
CREATE INDEX "IndividualsInCountries_individualId_idx" ON "IndividualsInCountries"("individualId");

-- CreateIndex
CREATE INDEX "IndividualsInCountries_countrycodePolpal_idx" ON "IndividualsInCountries"("countrycodePolpal");

-- CreateIndex
CREATE INDEX "IndividualsInCountries_userId_idx" ON "IndividualsInCountries"("userId");

-- CreateIndex
CREATE INDEX "IndividualsInEntities_individualId_idx" ON "IndividualsInEntities"("individualId");

-- CreateIndex
CREATE INDEX "IndividualsInEntities_polpalId_idx" ON "IndividualsInEntities"("polpalId");

-- CreateIndex
CREATE INDEX "IndividualsInEntities_userId_idx" ON "IndividualsInEntities"("userId");

-- CreateIndex
CREATE INDEX "Individuals_userId_idx" ON "Individuals"("userId");

-- CreateIndex
CREATE INDEX "LinksEntryToEntity_polpalId_idx" ON "LinksEntryToEntity"("polpalId");

-- CreateIndex
CREATE INDEX "LinksEntryToEntity_uniqueObservationId_idx" ON "LinksEntryToEntity"("uniqueObservationId");

-- CreateIndex
CREATE INDEX "LinksEntryToEntity_userId_idx" ON "LinksEntryToEntity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LinksEntryToEntity_uniqueObservationId_polpalId_key" ON "LinksEntryToEntity"("uniqueObservationId", "polpalId");

-- CreateIndex
CREATE INDEX "News_publishedPublicAt_idx" ON "News"("publishedPublicAt");

-- CreateIndex
CREATE INDEX "News_updatedPublicAt_idx" ON "News"("updatedPublicAt");

-- CreateIndex
CREATE INDEX "News_userId_idx" ON "News"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Projects_projectKey_key" ON "Projects"("projectKey");

-- CreateIndex
CREATE INDEX "Projects_userId_idx" ON "Projects"("userId");

-- CreateIndex
CREATE INDEX "References_countrycodePolpal_idx" ON "References"("countrycodePolpal");

-- CreateIndex
CREATE INDEX "References_polpalId_idx" ON "References"("polpalId");

-- CreateIndex
CREATE INDEX "References_entityChangeId_idx" ON "References"("entityChangeId");

-- CreateIndex
CREATE INDEX "References_entityNameId_idx" ON "References"("entityNameId");

-- CreateIndex
CREATE INDEX "References_groupingMemberId_idx" ON "References"("groupingMemberId");

-- CreateIndex
CREATE INDEX "References_individualId_idx" ON "References"("individualId");

-- CreateIndex
CREATE INDEX "References_individualCountryId_idx" ON "References"("individualCountryId");

-- CreateIndex
CREATE INDEX "References_individualEntityId_idx" ON "References"("individualEntityId");

-- CreateIndex
CREATE INDEX "References_projectKey_idx" ON "References"("projectKey");

-- CreateIndex
CREATE INDEX "References_datasetKey_idx" ON "References"("datasetKey");

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Users_username_key" ON "Users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Users_emailVerifyToken_key" ON "Users"("emailVerifyToken");

-- CreateIndex
CREATE UNIQUE INDEX "Users_passwordResetToken_key" ON "Users"("passwordResetToken");

-- CreateIndex
CREATE INDEX "Users_emailVerified_idx" ON "Users"("emailVerified");

-- CreateIndex
CREATE INDEX "Users_approvedByAdmin_idx" ON "Users"("approvedByAdmin");

-- CreateIndex
CREATE INDEX "Users_role_idx" ON "Users"("role");

-- CreateIndex
CREATE INDEX "ValidationLinks_linkId_idx" ON "ValidationLinks"("linkId");

-- CreateIndex
CREATE INDEX "ValidationLinks_userId_idx" ON "ValidationLinks"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ValidationLinks_linkId_userId_key" ON "ValidationLinks"("linkId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Versions_versionKey_key" ON "Versions"("versionKey");

-- CreateIndex
CREATE INDEX "Versions_projectKey_idx" ON "Versions"("projectKey");

-- CreateIndex
CREATE INDEX "Versions_datasetKey_idx" ON "Versions"("datasetKey");

-- CreateIndex
CREATE INDEX "Versions_userId_idx" ON "Versions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Versions_projectKey_datasetKey_versionKey_key" ON "Versions"("projectKey", "datasetKey", "versionKey");

-- AddForeignKey
ALTER TABLE "Changelog" ADD CONSTRAINT "Changelog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Countries" ADD CONSTRAINT "Countries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Datasets" ADD CONSTRAINT "Datasets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Datasets" ADD CONSTRAINT "Datasets_projectKey_fkey" FOREIGN KEY ("projectKey") REFERENCES "Projects"("projectKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntitiesInCountries" ADD CONSTRAINT "EntitiesInCountries_polpalId_fkey" FOREIGN KEY ("polpalId") REFERENCES "Entities"("polpalId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntitiesInCountries" ADD CONSTRAINT "EntitiesInCountries_countrycodePolpal_fkey" FOREIGN KEY ("countrycodePolpal") REFERENCES "Countries"("countrycodePolpal") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntitiesInCountries" ADD CONSTRAINT "EntitiesInCountries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entities" ADD CONSTRAINT "Entities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityChanges" ADD CONSTRAINT "EntityChanges_polpalIdOld_fkey" FOREIGN KEY ("polpalIdOld") REFERENCES "Entities"("polpalId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityChanges" ADD CONSTRAINT "EntityChanges_polpalIdNew_fkey" FOREIGN KEY ("polpalIdNew") REFERENCES "Entities"("polpalId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityChanges" ADD CONSTRAINT "EntityChanges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityNames" ADD CONSTRAINT "EntityNames_polpalId_fkey" FOREIGN KEY ("polpalId") REFERENCES "Entities"("polpalId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityNames" ADD CONSTRAINT "EntityNames_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entries" ADD CONSTRAINT "Entries_projectKey_fkey" FOREIGN KEY ("projectKey") REFERENCES "Projects"("projectKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entries" ADD CONSTRAINT "Entries_datasetKey_fkey" FOREIGN KEY ("datasetKey") REFERENCES "Datasets"("datasetKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entries" ADD CONSTRAINT "Entries_versionKey_fkey" FOREIGN KEY ("versionKey") REFERENCES "Versions"("versionKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entries" ADD CONSTRAINT "Entries_countrycodePolpal_fkey" FOREIGN KEY ("countrycodePolpal") REFERENCES "Countries"("countrycodePolpal") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entries" ADD CONSTRAINT "Entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupingMembers" ADD CONSTRAINT "GroupingMembers_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entities"("polpalId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupingMembers" ADD CONSTRAINT "GroupingMembers_groupingId_fkey" FOREIGN KEY ("groupingId") REFERENCES "Entities"("polpalId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupingMembers" ADD CONSTRAINT "GroupingMembers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndividualsInCountries" ADD CONSTRAINT "IndividualsInCountries_countrycodePolpal_fkey" FOREIGN KEY ("countrycodePolpal") REFERENCES "Countries"("countrycodePolpal") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndividualsInCountries" ADD CONSTRAINT "IndividualsInCountries_individualId_fkey" FOREIGN KEY ("individualId") REFERENCES "Individuals"("individualId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndividualsInCountries" ADD CONSTRAINT "IndividualsInCountries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndividualsInEntities" ADD CONSTRAINT "IndividualsInEntities_individualId_fkey" FOREIGN KEY ("individualId") REFERENCES "Individuals"("individualId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndividualsInEntities" ADD CONSTRAINT "IndividualsInEntities_polpalId_fkey" FOREIGN KEY ("polpalId") REFERENCES "Entities"("polpalId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndividualsInEntities" ADD CONSTRAINT "IndividualsInEntities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Individuals" ADD CONSTRAINT "Individuals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinksEntryToEntity" ADD CONSTRAINT "LinksEntryToEntity_uniqueObservationId_fkey" FOREIGN KEY ("uniqueObservationId") REFERENCES "Entries"("uniqueObservationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinksEntryToEntity" ADD CONSTRAINT "LinksEntryToEntity_polpalId_fkey" FOREIGN KEY ("polpalId") REFERENCES "Entities"("polpalId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinksEntryToEntity" ADD CONSTRAINT "LinksEntryToEntity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "News" ADD CONSTRAINT "News_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projects" ADD CONSTRAINT "Projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "References" ADD CONSTRAINT "References_countrycodePolpal_fkey" FOREIGN KEY ("countrycodePolpal") REFERENCES "Countries"("countrycodePolpal") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "References" ADD CONSTRAINT "References_polpalId_fkey" FOREIGN KEY ("polpalId") REFERENCES "Entities"("polpalId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "References" ADD CONSTRAINT "References_entitiesInCountriesId_fkey" FOREIGN KEY ("entitiesInCountriesId") REFERENCES "EntitiesInCountries"("entityInCountryId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "References" ADD CONSTRAINT "References_entityChangeId_fkey" FOREIGN KEY ("entityChangeId") REFERENCES "EntityChanges"("entityChangeId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "References" ADD CONSTRAINT "References_entityNameId_fkey" FOREIGN KEY ("entityNameId") REFERENCES "EntityNames"("entityNameId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "References" ADD CONSTRAINT "References_groupingMemberId_fkey" FOREIGN KEY ("groupingMemberId") REFERENCES "GroupingMembers"("groupingMemberId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "References" ADD CONSTRAINT "References_individualId_fkey" FOREIGN KEY ("individualId") REFERENCES "Individuals"("individualId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "References" ADD CONSTRAINT "References_individualCountryId_fkey" FOREIGN KEY ("individualCountryId") REFERENCES "IndividualsInCountries"("individualInCountryId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "References" ADD CONSTRAINT "References_individualEntityId_fkey" FOREIGN KEY ("individualEntityId") REFERENCES "IndividualsInEntities"("individualInEntityId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "References" ADD CONSTRAINT "References_projectKey_fkey" FOREIGN KEY ("projectKey") REFERENCES "Projects"("projectKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "References" ADD CONSTRAINT "References_datasetKey_fkey" FOREIGN KEY ("datasetKey") REFERENCES "Datasets"("datasetKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "References" ADD CONSTRAINT "References_versionKey_fkey" FOREIGN KEY ("versionKey") REFERENCES "Versions"("versionKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "References" ADD CONSTRAINT "References_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationLinks" ADD CONSTRAINT "ValidationLinks_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "LinksEntryToEntity"("linkEntriesToEntityId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationLinks" ADD CONSTRAINT "ValidationLinks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Versions" ADD CONSTRAINT "Versions_projectKey_fkey" FOREIGN KEY ("projectKey") REFERENCES "Projects"("projectKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Versions" ADD CONSTRAINT "Versions_datasetKey_fkey" FOREIGN KEY ("datasetKey") REFERENCES "Datasets"("datasetKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Versions" ADD CONSTRAINT "Versions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
