// npx tsx prisma/seed/seed.entities.ts

import { prisma } from "../../src/lib/server/prisma.server";
import entities from "./fixtures/PolPaL_initial_entities.json" with { type: "json" };

export async function seedEntitiesInCountries() {

    const userId = 1;

    const failedEntityCountryLinks: string[] = [];
    const skippedEntityCountryLinks: string[] = [];

    for (const entity of entities) {
        try {
            await prisma.entitiesInCountries.createMany({
                data: [{
                    polpalId: entity.partyfactsId,
                    countrycodePolpal: entity.countrycodePolpal,
                    userId: userId,
                }],
                skipDuplicates: true,
            });

            console.log(`Linked entity ${entity.nameShort}-${entity.nameEnglish} to country ${entity.countrycodePolpal}`);

        } catch (error) {
            const nameError = `${entity.countrycodePolpal}-${entity.nameShort}-${entity.partyfactsId}`;
            if (
                (error as { code?: string }).code === "P2003"
            ) {
                console.warn(`Skipped country-entity for ${nameError} due to missing countrycode in database: ${entity.countrycodePolpal}`);
                skippedEntityCountryLinks.push(nameError);
            } else {
                console.error(`Error creating ${nameError}:`, error);
                failedEntityCountryLinks.push(nameError);
            }
        }
    }

    console.log(`All entities processed.`);

    // Final summaries
    console.log("\n--- Summary ---");

    if (failedEntityCountryLinks.length) {
        console.log("\n--- Failed Country-Entity Links ---");
        console.log(`${failedEntityCountryLinks.length} country-entity links could NOT be created:`);
        failedEntityCountryLinks.forEach((p) => console.log("  -", p));
    } else {
        console.log("All country-entity links created successfully (no failures).");
    }

    if (skippedEntityCountryLinks.length) {
        console.log("\n--- Skipped Country-Entity Links ---");
        console.log(`${skippedEntityCountryLinks.length} country-entity links were skipped due to missing countrycode in PolPaL database:`);
        skippedEntityCountryLinks.forEach((p) => console.log("  -", p));
    } else {
        console.log("All country-entity links created successfully (no skips).");
    }
}