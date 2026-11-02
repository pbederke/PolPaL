/*
  Warnings:

  - You are about to drop the column `individualCountryId` on the `References` table. All the data in the column will be lost.
  - You are about to drop the column `individualEntityId` on the `References` table. All the data in the column will be lost.
  - You are about to drop the column `individualId` on the `References` table. All the data in the column will be lost.
  - You are about to drop the `Individuals` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `IndividualsInCountries` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `IndividualsInEntities` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Individuals" DROP CONSTRAINT "Individuals_userId_fkey";

-- DropForeignKey
ALTER TABLE "IndividualsInCountries" DROP CONSTRAINT "IndividualsInCountries_countrycodePolpal_fkey";

-- DropForeignKey
ALTER TABLE "IndividualsInCountries" DROP CONSTRAINT "IndividualsInCountries_individualId_fkey";

-- DropForeignKey
ALTER TABLE "IndividualsInCountries" DROP CONSTRAINT "IndividualsInCountries_userId_fkey";

-- DropForeignKey
ALTER TABLE "IndividualsInEntities" DROP CONSTRAINT "IndividualsInEntities_individualId_fkey";

-- DropForeignKey
ALTER TABLE "IndividualsInEntities" DROP CONSTRAINT "IndividualsInEntities_polpalId_fkey";

-- DropForeignKey
ALTER TABLE "IndividualsInEntities" DROP CONSTRAINT "IndividualsInEntities_userId_fkey";

-- DropForeignKey
ALTER TABLE "References" DROP CONSTRAINT "References_individualCountryId_fkey";

-- DropForeignKey
ALTER TABLE "References" DROP CONSTRAINT "References_individualEntityId_fkey";

-- DropForeignKey
ALTER TABLE "References" DROP CONSTRAINT "References_individualId_fkey";

-- DropIndex
DROP INDEX "References_individualCountryId_idx";

-- DropIndex
DROP INDEX "References_individualEntityId_idx";

-- DropIndex
DROP INDEX "References_individualId_idx";

-- AlterTable
ALTER TABLE "References" DROP COLUMN "individualCountryId",
DROP COLUMN "individualEntityId",
DROP COLUMN "individualId";

-- DropTable
DROP TABLE "Individuals";

-- DropTable
DROP TABLE "IndividualsInCountries";

-- DropTable
DROP TABLE "IndividualsInEntities";

-- DropEnum
DROP TYPE "GenderEnum";
