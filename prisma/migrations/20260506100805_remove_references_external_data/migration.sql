/*
  Warnings:

  - You are about to drop the column `datasetKey` on the `References` table. All the data in the column will be lost.
  - You are about to drop the column `projectKey` on the `References` table. All the data in the column will be lost.
  - You are about to drop the column `versionKey` on the `References` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "References" DROP CONSTRAINT "References_datasetKey_fkey";

-- DropForeignKey
ALTER TABLE "References" DROP CONSTRAINT "References_projectKey_fkey";

-- DropForeignKey
ALTER TABLE "References" DROP CONSTRAINT "References_versionKey_fkey";

-- DropIndex
DROP INDEX "References_datasetKey_idx";

-- DropIndex
DROP INDEX "References_projectKey_idx";

-- AlterTable
ALTER TABLE "References" DROP COLUMN "datasetKey",
DROP COLUMN "projectKey",
DROP COLUMN "versionKey";

-- CreateIndex
CREATE INDEX "References_entitiesInCountriesId_idx" ON "References"("entitiesInCountriesId");
