-- These tables are created and managed by rate-limiter-flexible (RateLimiterPostgres).
-- They are NOT Prisma models. This migration absorbs them into migration history
-- so that `prisma migrate dev` does not detect them as drift.

-- CreateTable
CREATE TABLE IF NOT EXISTS "rate_limiter_login" (
    "key" VARCHAR(255) NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "expire" BIGINT,
    CONSTRAINT "rate_limiter_login_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "rate_limiter_register" (
    "key" VARCHAR(255) NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "expire" BIGINT,
    CONSTRAINT "rate_limiter_register_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "rate_limiter_download" (
    "key" VARCHAR(255) NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "expire" BIGINT,
    CONSTRAINT "rate_limiter_download_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "rate_limiter_password_reset" (
    "key" VARCHAR(255) NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "expire" BIGINT,
    CONSTRAINT "rate_limiter_password_reset_pkey" PRIMARY KEY ("key")
);
