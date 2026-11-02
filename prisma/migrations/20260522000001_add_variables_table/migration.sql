-- AlterEnum
ALTER TYPE "TableNamesEnum" ADD VALUE 'variables';

-- CreateTable
CREATE TABLE "Variables" (
    "variableId" SERIAL NOT NULL,
    "versionKey" TEXT NOT NULL,
    "entryEntityIdVar" TEXT NOT NULL,
    "varTitle" TEXT NOT NULL,
    "varContent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "Variables_pkey" PRIMARY KEY ("variableId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Variables_versionKey_entryEntityIdVar_key" ON "Variables"("versionKey", "entryEntityIdVar");

-- CreateIndex
CREATE INDEX "Variables_versionKey_idx" ON "Variables"("versionKey");

-- CreateIndex
CREATE INDEX "Variables_userId_idx" ON "Variables"("userId");

-- AddForeignKey
ALTER TABLE "Variables" ADD CONSTRAINT "Variables_versionKey_fkey" FOREIGN KEY ("versionKey") REFERENCES "Versions"("versionKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variables" ADD CONSTRAINT "Variables_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
