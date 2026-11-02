/*
  Warnings:

  - You are about to drop the column `countrycodePolpal` on the `References` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "References" DROP CONSTRAINT "References_countrycodePolpal_fkey";

-- DropIndex
DROP INDEX "References_countrycodePolpal_idx";

-- AlterTable
ALTER TABLE "References" DROP COLUMN "countrycodePolpal";
