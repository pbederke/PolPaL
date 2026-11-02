import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntitiesWithColors } from '@/modules/entities/entities.service';

const COLOR_COUNT = 6;
const CACHE_TTL_MS = 1 * 60 * 1000; // 1 minute

type ColorEntity = {
  polpalId: number;
  nameShort: string;
  nameEnglish: string;
  color: string;
};

let cache: { data: ColorEntity[]; expiresAt: number } | null = null;

export async function GET() {
  const _auth = await enforceRouteAuth('/api/entities/random-colors', 'GET');
  if (_auth instanceof NextResponse) return _auth;

  if (cache && Date.now() < cache.expiresAt) {
    return NextResponse.json(cache.data);
  }

  try {
    const candidates = await getEntitiesWithColors();

    if (candidates.length === 0) {
      return NextResponse.json([]);
    }

    // Fisher-Yates shuffle, take COLOR_COUNT
    const withColor = candidates.filter((e) => e.color !== null) as { polpalId: number; nameShort: string; nameEnglish: string; color: string }[];
    const shuffled = [...withColor];
    const take = Math.min(COLOR_COUNT, shuffled.length);
    for (let i = 0; i < take; i++) {
      const j = i + Math.floor(Math.random() * (shuffled.length - i));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const result: ColorEntity[] = shuffled.slice(0, take).map((e) => ({
      polpalId: e.polpalId,
      nameShort: e.nameShort,
      nameEnglish: e.nameEnglish,
      color: e.color,
    }));

    cache = { data: result, expiresAt: Date.now() + CACHE_TTL_MS };
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
