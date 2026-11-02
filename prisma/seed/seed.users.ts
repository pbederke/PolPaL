// npx tsx prisma/seed/seed.users.ts

import bcrypt from "bcrypt";
import { prisma } from "../../src/lib/server/prisma.server";
import { RoleEnum } from '@prisma/client';

export async function seedUsers() {

  // Data Robot
  await prisma.users.upsert({
    where: { email: "" },
    update: {},
    create: {
      nameFirst: "Data",
      nameLast: "Robot",
      email: "",
      username: "data-robot",
      password: await bcrypt.hash(process.env.ROBOT_PASSWORD!, 12),
      emailVerified: true,
      approvedByAdmin: true,
      role: RoleEnum.ROBOT,
    },
  });

  console.log("Data Robot user seeded");
  
  // Admin
  await prisma.users.upsert({
    where: { email: "info@polpal.org" },
    update: {},
    create: {
      nameFirst: "Info",
      nameLast: "PolPaL",
      email: "info@polpal.org",
      username: "admin",
      password: await bcrypt.hash(process.env.ADMIN_PASSWORD!, 12),
      emailVerified: true,
      approvedByAdmin: true,
      role: RoleEnum.ADMIN,
    },
  });

  console.log("Info PolPaL (admin) user seeded");
}