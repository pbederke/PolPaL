import { NextRequest, NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getCachedEntityLogo, cacheEntityLogo } from '@/modules/entities/entities.service';
import logger from '@/lib/server/logger.server';

const LOGO_CACHE_TTL_DAYS = 30;

type Attribution = {
  artist: string;
  credit: string;
  license: string;
  filePageUrl: string;
  restrictions: string;
};

/** Strip HTML tags from a Commons metadata string, collapse whitespace, and remove text
 *  repeated by Commons (e.g. two language spans both rendering "Unknown author"). */
function stripHtml(raw: string): string {
  const s = raw.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return s.replace(/^(.+?) ?\1$/, '$1');
}

/**
 * Given a Wikimedia Commons upload URL, derive the filename and call the
 * Commons MediaWiki API to retrieve attribution metadata.
 */
async function fetchCommonsAttribution(commonsUrl: string): Promise<Attribution | null> {
  // Commons URLs look like:
  //   https://upload.wikimedia.org/wikipedia/commons/<hash>/<hash>/Filename.svg
  // The filename is the last path segment, URL-encoded.
  const urlPath = new URL(commonsUrl).pathname;
  const rawFilename = urlPath.split('/').pop();
  if (!rawFilename) return null;
  const filename = decodeURIComponent(rawFilename);

  const apiUrl =
    `https://commons.wikimedia.org/w/api.php?action=query` +
    `&titles=${encodeURIComponent('File:' + filename)}` +
    `&prop=imageinfo&iiprop=extmetadata%7Curl&format=json`;

  try {
    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': 'PolPaL/1.0 (https://polpal.org)' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const pages: Record<string, unknown> = data?.query?.pages ?? {};
    const page = Object.values(pages)[0] as Record<string, unknown> | undefined;
    if (!page) return null;

    const imageinfo = (page.imageinfo as Record<string, unknown>[] | undefined)?.[0];
    if (!imageinfo) return null;

    const meta = imageinfo.extmetadata as Record<string, { value: string }> | undefined;
    const filePageUrl = (imageinfo.descriptionurl as string | undefined) ?? '';

    const artist = meta?.Artist?.value ? stripHtml(meta.Artist.value) : '';
    const credit = meta?.Credit?.value ? stripHtml(meta.Credit.value) : '';
    const license = meta?.LicenseShortName?.value ?? meta?.UsageTerms?.value ?? '';
    const restrictions = meta?.Restrictions?.value ?? '';

    return { artist, credit, license, filePageUrl, restrictions };
  } catch {
    return null;
  }
}

/**
 * Proxy for Wikidata SPARQL queries to fetch entity logos.
 * Avoids CSP connect-src restrictions on client-side cross-origin fetches.
 * Caches the resolved Wikimedia Commons URL and attribution in the DB for 30 days.
 */
export async function GET(request: NextRequest) {
  const _auth = await enforceRouteAuth('/api/wikidata-logo', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  const wikidataId = request.nextUrl.searchParams.get('id');
  if (!wikidataId || !/^Q\d+$/.test(wikidataId)) {
    return NextResponse.json({ message: 'Invalid Wikidata ID' }, { status: 400 });
  }

  // Check DB cache first
  let entity: Awaited<ReturnType<typeof getCachedEntityLogo>>;
  try {
    entity = await getCachedEntityLogo(wikidataId);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/wikidata-logo: DB cache lookup failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }

  if (entity?.logoUrl && entity.logoUrlCachedAt) {
    const ageMs = Date.now() - entity.logoUrlCachedAt.getTime();
    const ttlMs = LOGO_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
    if (ageMs < ttlMs) {
      let attribution: Attribution | null = null;
      try {
        attribution = entity.logoAttribution ? (JSON.parse(entity.logoAttribution) as Attribution) : null;
      } catch {
        // corrupted attribution — serve logo without attribution
      }
      return NextResponse.json({ logoUrl: entity.logoUrl, attribution });
    }
  }

  // Fetch from Wikidata SPARQL
  const sparqlQuery = `
    SELECT ?logo WHERE {
      wd:${wikidataId} wdt:P154 ?logo .
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
    if (Array.isArray(bindings) && bindings.length > 0 && bindings[0]?.logo?.value) {
      // Ensure HTTPS so the browser doesn't hit a mixed-content or CSP block
      const logoUrl = (bindings[0].logo.value as string).replace(/^http:\/\//, 'https://');

      // Fetch attribution from Wikimedia Commons
      const attribution = await fetchCommonsAttribution(logoUrl);

      // Persist to DB if the entity was found
      if (entity) {
        await cacheEntityLogo(entity.polpalId, logoUrl, attribution ? JSON.stringify(attribution) : null);
      }

      return NextResponse.json({ logoUrl, attribution });
    }

    return NextResponse.json({ logoUrl: null, attribution: null });
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/wikidata-logo failed');
    return NextResponse.json({ message: 'Failed to fetch from Wikidata' }, { status: 502 });
  }
}
