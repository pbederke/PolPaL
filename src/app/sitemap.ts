import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/server/prisma.server';

/**
 * `force-dynamic` prevents Next.js from attempting to pre-render the sitemap
 * at build time. The sitemap queries the database, which is not available
 * during the build step (e.g. in CI or Docker build). Marking it dynamic
 * ensures it is generated on the first request at runtime instead.
 */
export const dynamic = 'force-dynamic';

/**
 * Generates the /sitemap.xml file for search engine discovery.
 *
 * Structure:
 *
 * Static routes — manually listed public pages (documentation + top-level data pages).
 *   Priority 1.0 for the home page, 0.8 for all others. changeFrequency 'weekly'.
 *
 * Dynamic routes — generated from lightweight Prisma queries (select minimal fields only).
 *   All queries filter out hidden records (`isHidden: false`) so unpublished or
 *   duplicate content is never exposed in the sitemap.
 *
 *   - /data/countries/[code]                          — one entry per visible country
 *   - /data/entities/[id]                             — one entry per visible entity
 *   - /data/projects/[projectKey]                     — one entry per visible project
 *   - /data/projects/[pKey]/[dKey]                    — one entry per visible dataset
 *   - /data/projects/[pKey]/[dKey]/[vKey]             — one entry per visible version
 *
 * Excluded from sitemap (also blocked in robots.txt or noindexed):
 *   - /admin/, /manage/, /user/, /api/   — authenticated/internal routes
 *   - /data/linking/                     — internal tool, noindexed
 *   - Authentication utility pages       — verify-email, session-expired, etc.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

  // Static routes: manually maintained list of all public, non-dynamic pages.
  // /data/tools and /data/linking are intentionally omitted:
  //   - /data/tools     is a placeholder with no real content yet
  //   - /data/linking   is noindexed and blocked in robots.txt
  const staticRoutes: MetadataRoute.Sitemap = [
    '/',
    '/documentation/about',
    '/documentation/news',
    '/documentation/contribute',
    '/documentation/codebook',
    '/documentation/tutorials',
    '/documentation/contact',
    '/data/countries',
    '/data/projects',
    '/data/download',
    '/data/entities',
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    changeFrequency: 'weekly' as const,
    priority: path === '/' ? 1 : 0.8,
  }));

  // Dynamic routes: all five queries run in parallel to minimise latency.
  // Only `isHidden: false` records are included — hidden entries are
  // unpublished/duplicate and must not appear in the sitemap.
  // Selects are kept minimal (only the fields needed to build URLs) to
  // avoid unnecessary data transfer on every sitemap request.
  const [countries, entities, projects, datasets, versions] = await Promise.all([
    prisma.countries.findMany({ where: { isHidden: false }, select: { countrycodePolpal: true, updatedAt: true } }),
    prisma.entities.findMany({ where: { isHidden: false }, select: { polpalId: true, updatedAt: true } }),
    prisma.projects.findMany({ where: { isHidden: false }, select: { projectKey: true, updatedAt: true } }),
    prisma.datasets.findMany({ where: { isHidden: false }, select: { datasetKey: true, projectKey: true, updatedAt: true } }),
    prisma.versions.findMany({ where: { isHidden: false }, select: { versionKey: true, datasetKey: true, projectKey: true, updatedAt: true } }),
  ]);

  const countryRoutes: MetadataRoute.Sitemap = countries.map((c) => ({
    url: `${baseUrl}/data/countries/${c.countrycodePolpal}`,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
    lastModified: c.updatedAt,
  }));

  const entityRoutes: MetadataRoute.Sitemap = entities.map((e) => ({
    url: `${baseUrl}/data/entities/${e.polpalId}`,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
    lastModified: e.updatedAt,
  }));

  const projectRoutes: MetadataRoute.Sitemap = projects.map((p) => ({
    url: `${baseUrl}/data/projects/${p.projectKey}`,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
    lastModified: p.updatedAt,
  }));

  const datasetRoutes: MetadataRoute.Sitemap = datasets.map((d) => ({
    url: `${baseUrl}/data/projects/${d.projectKey}/${d.datasetKey}`,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
    lastModified: d.updatedAt,
  }));

  const versionRoutes: MetadataRoute.Sitemap = versions.map((v) => ({
    url: `${baseUrl}/data/projects/${v.projectKey}/${v.datasetKey}/${v.versionKey}`,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
    lastModified: v.updatedAt,
  }));

  return [
    ...staticRoutes,
    ...countryRoutes,
    ...entityRoutes,
    ...projectRoutes,
    ...datasetRoutes,
    ...versionRoutes,
  ];
}
