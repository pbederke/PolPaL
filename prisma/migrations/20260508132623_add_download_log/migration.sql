-- CreateEnum
CREATE TYPE "DownloadType" AS ENUM ('COUNTRIES', 'ENTITIES', 'GROUPINGS', 'ENTRIES', 'SCRIPT');

-- CreateTable
CREATE TABLE "download_logs" (
    "id" SERIAL NOT NULL,
    "downloadType" "DownloadType" NOT NULL,
    "versionKey" TEXT,
    "filters" JSONB NOT NULL,
    "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "download_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "download_logs_downloadType_idx" ON "download_logs"("downloadType");

-- CreateIndex
CREATE INDEX "download_logs_downloadedAt_idx" ON "download_logs"("downloadedAt");

-- CreateIndex
CREATE INDEX "download_logs_versionKey_idx" ON "download_logs"("versionKey");

-- AddForeignKey
ALTER TABLE "download_logs" ADD CONSTRAINT "download_logs_versionKey_fkey" FOREIGN KEY ("versionKey") REFERENCES "Versions"("versionKey") ON DELETE SET NULL ON UPDATE CASCADE;
