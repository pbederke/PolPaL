import { config } from "dotenv";
config({ path: process.env.PRISMA_ENV === "production" ? ".env.production.local" : ".env.local" });
import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: "prisma",
    migrations: {
        path: "prisma/migrations",
        seed: "tsx prisma/seed/seed.all.ts",
    },
    datasource: {
        // Use placeholder during Docker build, actual URL at runtime
        url: process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder",
    },
});