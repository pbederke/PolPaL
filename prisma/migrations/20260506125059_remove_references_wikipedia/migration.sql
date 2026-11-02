/*
  Warnings:

  - The values [Wikipedia] on the enum `ReferenceTypeEnum` will be renamed to [Website] and afterwards removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
UPDATE "References" SET "type" = 'Website' WHERE "type" = 'Wikipedia';
CREATE TYPE "ReferenceTypeEnum_new" AS ENUM ('Website', 'Literature', 'Document', 'Database', 'News', 'Other');
ALTER TABLE "References" ALTER COLUMN "type" TYPE "ReferenceTypeEnum_new" USING ("type"::text::"ReferenceTypeEnum_new");
ALTER TYPE "ReferenceTypeEnum" RENAME TO "ReferenceTypeEnum_old";
ALTER TYPE "ReferenceTypeEnum_new" RENAME TO "ReferenceTypeEnum";
DROP TYPE "public"."ReferenceTypeEnum_old";
COMMIT;
