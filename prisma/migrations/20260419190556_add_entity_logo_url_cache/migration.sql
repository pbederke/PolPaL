/*
  Warnings:

  - You are about to drop the `rate_limiter_download` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `rate_limiter_login` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `rate_limiter_password_reset` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `rate_limiter_register` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Entities" ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "logoUrlCachedAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "rate_limiter_download";

-- DropTable
DROP TABLE "rate_limiter_login";

-- DropTable
DROP TABLE "rate_limiter_password_reset";

-- DropTable
DROP TABLE "rate_limiter_register";
