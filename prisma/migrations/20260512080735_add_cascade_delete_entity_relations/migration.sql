-- DropForeignKey
ALTER TABLE "EntityChanges" DROP CONSTRAINT "EntityChanges_polpalIdNew_fkey";

-- DropForeignKey
ALTER TABLE "EntityChanges" DROP CONSTRAINT "EntityChanges_polpalIdOld_fkey";

-- DropForeignKey
ALTER TABLE "GroupingMembers" DROP CONSTRAINT "GroupingMembers_entityId_fkey";

-- DropForeignKey
ALTER TABLE "GroupingMembers" DROP CONSTRAINT "GroupingMembers_groupingId_fkey";

-- AddForeignKey
ALTER TABLE "EntityChanges" ADD CONSTRAINT "EntityChanges_polpalIdOld_fkey" FOREIGN KEY ("polpalIdOld") REFERENCES "Entities"("polpalId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityChanges" ADD CONSTRAINT "EntityChanges_polpalIdNew_fkey" FOREIGN KEY ("polpalIdNew") REFERENCES "Entities"("polpalId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupingMembers" ADD CONSTRAINT "GroupingMembers_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entities"("polpalId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupingMembers" ADD CONSTRAINT "GroupingMembers_groupingId_fkey" FOREIGN KEY ("groupingId") REFERENCES "Entities"("polpalId") ON DELETE CASCADE ON UPDATE CASCADE;
