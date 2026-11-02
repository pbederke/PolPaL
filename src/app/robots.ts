import type { MetadataRoute } from 'next';

/**
 * Generates the /robots.txt file served by Next.js at build/request time.
 *
 * Rules:
 * - All crawlers are allowed to index public-facing routes (`/`).
 * - The following paths are explicitly disallowed:
 *   - /admin/       — admin-only management UI, never public
 *   - /manage/      — authenticated data-management pages
 *   - /user/        — user profile and account pages
 *   - /api/         — all API route handlers; no HTML content for crawlers
 *   - /data/linking/ — internal linking-overview tool, not intended for public indexing
 *
 * The sitemap URL is injected so crawlers can discover all public pages.
 * NEXT_PUBLIC_BASE_URL must be set in production; falls back to localhost for dev.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/manage/', '/user/', '/api/', '/data/linking/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
