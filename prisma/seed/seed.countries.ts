// npx tsx prisma/seed/seed.countries.ts

import { prisma } from "../../src/lib/server/prisma.server";
import countries from "./fixtures/PolPaL_initial_countries.json" with { type: "json" };

export async function seedCountries() {
  const userId = 1;

  for (const country of countries) {
    // Define data
    const data = {
      countrycodePolpal: country.countrycodePolpal,
      isHidden: false,
      isHiddenReason: null,
      isCountry: country.isCountry || false,
      countryname: country.countryname,
      iso2c: country.iso2c || null,
      iso3c: country.iso3c || null,
      iso3n: country.iso3n || null,
      countrycodeRPackage: country.countrycodeRPackage || null,
      region: country.region,
      regionCode: country.regionCode,
      regionSub: country.regionSub,
      regionSubCode: country.regionSubCode,
      regionIntermediate: country.regionIntermediate || null,
      regionIntermediateCode: country.regionIntermediateCode || null,
      userId: userId,
    };

    // Upsert country
    await prisma.countries.createMany({
      data: [data],
      skipDuplicates: true,
    });

    console.log(`Seeded country ${country.countrycodePolpal}-${country.countryname}`);
  }
  console.log(`All countries seeded.`);
}