import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntitiesWithWikidataIds } from '@/modules/entities/entities.service';

const LOGO_COUNT = 6;
// Sample a larger pool so we have enough candidates that actually have logos
const SAMPLE_SIZE = 30;

// Wikidata IDs to never show in the random logo carousel
const EXCLUDED_WIKIDATA_IDS = new Set(['Q7320']);
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type Attribution = {
  artist: string;
  credit: string;
  license: string;
  filePageUrl: string;
  restrictions: string;
};

type CachedLogoEntity = {
  polpalId: number;
  nameShort: string;
  nameEnglish: string;
  wikidataId: string;
  logoUrl: string;
  attribution: Attribution | null;
};

let cache: { data: CachedLogoEntity[]; expiresAt: number } | null = null;

/** Strip HTML tags from a Commons metadata string, collapse whitespace, and remove text
 *  repeated by Commons (e.g. two language spans both rendering "Unknown author"). */
function stripHtml(raw: string): string {
  const s = raw.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return s.replace(/^(.+?) ?\1$/, '$1');
}

async function fetchLogo(wikidataId: string): Promise<{ logoUrl: string; attribution: Attribution | null } | null> {
  const qNumber = wikidataId.includes('/') ? wikidataId.split('/').pop() : wikidataId;
  if (!qNumber || !/^Q\d+$/.test(qNumber)) return null;

  const sparqlQuery = `SELECT ?logo WHERE { wd:${qNumber} wdt:P154 ?logo . } LIMIT 1`;
  const sparqlUrl = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}`;

  try {
    const res = await fetch(sparqlUrl, {
      headers: {
        Accept: 'application/sparql-results+json',
        'User-Agent': 'PolPaL/1.0 (https://polpal.org)',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const bindings = data.results?.bindings;
    if (!Array.isArray(bindings) || bindings.length === 0 || !bindings[0]?.logo?.value) return null;

    const logoUrl = (bindings[0].logo.value as string).replace(/^http:\/\//, 'https://');

    // Fetch attribution from Wikimedia Commons
    const attribution = await fetchCommonsAttribution(logoUrl);

    return { logoUrl, attribution };
  } catch {
    // swallow — no logo
  }
  return null;
}

async function fetchCommonsAttribution(commonsUrl: string): Promise<Attribution | null> {
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

    const apiData = await res.json();
    const pages: Record<string, unknown> = apiData?.query?.pages ?? {};
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

export async function GET() {
  const _auth = await enforceRouteAuth('/api/entities/random-logos', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  // Serve from in-memory cache if still valid
  if (cache && Date.now() < cache.expiresAt) {
    return NextResponse.json(cache.data);
  }

  try {
    // Fetch all non-hidden entities that have a Wikidata ID
    const candidates = await getEntitiesWithWikidataIds();

    if (candidates.length === 0) {
      return NextResponse.json([]);
    }

    // Exclude blocked Wikidata IDs
    const filtered = candidates.filter(
      (e) => !EXCLUDED_WIKIDATA_IDS.has(e.wikidataId as string)
    );

    // Randomly shuffle and take SAMPLE_SIZE candidates to query Wikidata
    const shuffled = [...filtered];
    const take = Math.min(SAMPLE_SIZE, shuffled.length);
    for (let i = 0; i < take; i++) {
      const j = i + Math.floor(Math.random() * (shuffled.length - i));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const pool = shuffled.slice(0, take);

    // Fetch logos for all pool candidates in parallel
    const withLogos = await Promise.all(
      pool.map(async (entity) => {
        const result = await fetchLogo(entity.wikidataId as string);
        return result ? { ...entity, logoUrl: result.logoUrl, attribution: result.attribution } : null;
      })
    );

    // Keep only candidates that returned a logo, then pick LOGO_COUNT at random
    const withLogosFiltered = withLogos.filter((e): e is NonNullable<typeof e> => e !== null);

    const resultPool = [...withLogosFiltered];
    const resultTake = Math.min(LOGO_COUNT, resultPool.length);
    for (let i = 0; i < resultTake; i++) {
      const j = i + Math.floor(Math.random() * (resultPool.length - i));
      [resultPool[i], resultPool[j]] = [resultPool[j], resultPool[i]];
    }

    const result = resultPool.slice(0, resultTake) as CachedLogoEntity[];
    cache = { data: result, expiresAt: Date.now() + CACHE_TTL_MS };
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
