// npx tsx prisma/seed/seed.all.ts

import { config } from 'dotenv';
config({ path: '.env.local' });
import { seedUsers } from './seed.users.js';
import { seedCountries } from './seed.countries.js';
import { seedEntities } from './seed.entities.js';
import { seedEntitiesInCountries } from './seed.entities-in-countries.js';
import { prisma } from "../../src/lib/server/prisma.server.js";



async function main() {
  console.log('Start seeding...');
  
  await seedUsers();
  console.log('Seeded users.');

  await seedCountries();
  console.log('Seeded countries.');

  await seedEntities();
  console.log('Seeded entities.');

  await seedEntitiesInCountries();
  console.log('Seeded entity-country links.');

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });