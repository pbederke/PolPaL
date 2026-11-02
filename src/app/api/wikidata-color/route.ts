import { NextRequest, NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getCachedEntityColor, cacheEntityColor } from '@/modules/entities/entities.service';
import logger from '@/lib/server/logger.server';

const COLOR_CACHE_TTL_DAYS = 30;

/**
 * Proxy for Wikidata SPARQL queries to fetch entity brand colors.
 * Avoids CSP connect-src restrictions on client-side cross-origin fetches.
 * Caches the resolved hex color string (without leading #) in the DB for 30 days.
 *
 * Uses Wikidata property P465 (hex triplet) directly on the entity, or falls back
 * to traversing P462 (color item) → P465 (hex triplet on the color item).
 */
export async function GET(request: NextRequest) {
  const _auth = await enforceRouteAuth('/api/wikidata-color', 'GET');
  if (_auth instanceof NextResponse) return _auth;

  const wikidataId = request.nextUrl.searchParams.get('id');
  if (!wikidataId || !/^Q\d+$/.test(wikidataId)) {
    return NextResponse.json({ message: 'Invalid Wikidata ID' }, { status: 400 });
  }

  // Check DB cache first
  let entity: Awaited<ReturnType<typeof getCachedEntityColor>>;
  try {
    entity = await getCachedEntityColor(wikidataId);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/wikidata-color: DB cache lookup failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }

  if (entity?.color && entity.colorCachedAt) {
    const ageMs = Date.now() - entity.colorCachedAt.getTime();
    const ttlMs = COLOR_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
    if (ageMs < ttlMs) {
      return NextResponse.json({ color: entity.color });
    }
  }

  // Fetch from Wikidata SPARQL
  // Try direct P465 (hex triplet) first; fall back to P462 (color item) → P465
  const sparqlQuery = `
    SELECT ?hex WHERE {
      {
        wd:${wikidataId} wdt:P465 ?hex .
      }
      UNION
      {
        wd:${wikidataId} wdt:P462 ?colorItem .
        ?colorItem wdt:P465 ?hex .
      }
    }
    LIMIT 1
  `;

  const sparqlUrl = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}`;

  try {
    const response = await fetch(sparqlUrl, {
      headers: {
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'PolPaL/1.0 (https://polpal.org)',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json({ message: 'Wikidata request failed' }, { status: 502 });
    }

    const data = await response.json();
    const bindings = data.results?.bindings;
    if (Array.isArray(bindings) && bindings.length > 0 && bindings[0]?.hex?.value) {
      // Normalize: strip leading # if present, uppercase
      const raw = bindings[0].hex.value as string;
      const color = raw.replace(/^#/, '').toUpperCase();

      // Persist to DB if the entity was found
      if (entity) {
        await cacheEntityColor(entity.polpalId, color);
      }

      return NextResponse.json({ color });
    }

    return NextResponse.json({ color: null });
  } catch (error: unknown) {
    // Upstream Wikidata failures (timeouts, network errors) are expected intermittently;
    // log as warn rather than error so they don't pollute error-level alerting.
    logger.warn({ err: error }, 'GET /api/wikidata-color failed');
    return NextResponse.json({ message: 'Failed to fetch from Wikidata' }, { status: 502 });
  }
}
