/*
  Warnings:

  - You are about to drop the column `wikidataId` on the `Countries` table. All the data in the column will be lost.
  - You are about to drop the column `wikipediaUrl` on the `Countries` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Countries" DROP COLUMN "wikidataId",
DROP COLUMN "wikipediaUrl";
