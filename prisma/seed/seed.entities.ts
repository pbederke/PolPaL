// npx tsx prisma/seed/seed.entities.ts

import { EntityTypesEnum } from '@prisma/client';
import { prisma } from "../../src/lib/server/prisma.server";
import entities from "./fixtures/PolPaL_initial_entities.json" with { type: "json" };

export async function seedEntities() {

  const userId = 1;

  const failedEntities: string[] = [];

  for (const entity of entities) {
    try {
      await prisma.entities.createMany({
        data: [{
          // IDs and primary key
          polpalId: entity.partyfactsId,
          partyfactsId: entity.partyfactsId,
          // Entity Hidden
          isHidden: false,
          isHiddenReason: null,
          // Entity information
          nameShort: String(entity.nameShort),
          nameEnglish: entity.nameEnglish,
          name: entity.name || null,
          entityType: entity.entityType as EntityTypesEnum,
          // Additional information
          wikipediaUrl: entity.wikipediaUrl || null,
          wikidataId: entity.wikidataId || null,
          comment: null,
          // Author information
          userId: userId,
        }],
        skipDuplicates: true,
      });

      console.log(`Created entity ${entity.nameShort}-${entity.nameEnglish} (${entity.wikipediaUrl})`);

    } catch (error) {
      const nameError = `${entity.countrycodePolpal}-${entity.nameShort}-${entity.partyfactsId}`;
      console.error(`Error creating ${nameError}:`, error);
      failedEntities.push(nameError);
    }
  }

  console.log(`All entities processed.`);

  // Fix autoincrement sequence for PostgreSQL
  try {
    await prisma.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('"Entities"', 'polpalId'),
        (SELECT COALESCE(MAX("polpalId"), 0) + 1 FROM "Entities")
      );
    `);
    console.log("Autoincrement sequence for polpalId reset successfully.");
  } catch (err) {
    console.warn("Could not reset autoincrement sequence:", err);
  }


  // Final summaries
  console.log("\n--- Summary ---");

  if (failedEntities.length) {
    console.log(`${failedEntities.length} entities could NOT be created:`);
    failedEntities.forEach((p) => console.log("  -", p));
  } else {
    console.log("All entities created successfully (no failures).");
  }

  // Add the following entities with all countries linked to them:
  // Independent
  // Others
  // Residual
  // Unknown

  const specialEntities = [
    { nameShort: "Independent", nameEnglish: "Independent", entityType: EntityTypesEnum.INDEPENDENT, comment: "This entity represents independent actors. It serves as a catch-all category for entries that are either individual persons or the grouped category for independents." },
    { nameShort: "Others", nameEnglish: "Others", entityType: EntityTypesEnum.OTHERS, comment: "This entity represents the 'Others' category often appearing in datasets." },
    { nameShort: "Residual", nameEnglish: "Residual", entityType: EntityTypesEnum.RESIDUAL, comment: "This entity represents observations like 'Invalid', 'Not voted', or other residual categories." },
    { nameShort: "Unknown", nameEnglish: "Unknown", entityType: EntityTypesEnum.UNKNOWN, comment: "This entity represents entries with unknown classification." },
  ];

  for (const special of specialEntities) {
    try {
      await prisma.entities.createMany({
        data: [{
          partyfactsId: null,
          isHidden: false,
          isHiddenReason: null,
          nameShort: special.nameShort,
          nameEnglish: special.nameEnglish,
          name: special.nameEnglish,
          entityType: special.entityType,
          wikipediaUrl: null,
          wikidataId: null,
          comment: special.comment,
          userId: userId,
        }],
        skipDuplicates: true,
      });
      console.log(`Created special entity ${special.nameShort}`);
    } catch (error: unknown) {
      console.error(`Error creating special entity ${special.nameShort}:`, error);
    }
  }

  // Assign all countries to each special entity
  const allCountries = await prisma.countries.findMany({ select: { countrycodePolpal: true } });
  const specialEntitiesInDb = await prisma.entities.findMany({
    where: {
      nameShort: { in: specialEntities.map(e => e.nameShort) },
    },
    select: { polpalId: true },
  });

  for (const special of specialEntitiesInDb) {
    for (const country of allCountries) {
      try {
        await prisma.entitiesInCountries.create({
          data: {
            countrycodePolpal: country.countrycodePolpal,
            polpalId: special.polpalId,
          },
        });

        console.log(`Linked country ${country.countrycodePolpal} to special entity ${special.polpalId}`);
      } catch (error: unknown) {
        console.error(`Error assigning country ${country.countrycodePolpal} to special entity ${special.polpalId}:`, error);
      }
    }
  }
}