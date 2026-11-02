import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getNews, createNews } from '@/modules/news/news.service';
import { NewsCreateSchema } from '@/modules/news/news.schema';
import logger from '@/lib/server/logger.server';

export async function GET(request: Request) {
  const _auth = await enforceRouteAuth('/api/news', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const url = new URL(request.url);
    const skip = Number(url.searchParams.get('skip') ?? 0);
    const take = Math.min(Math.max(Number(url.searchParams.get('take') ?? 30), 1), 1000);
    const data = await getNews(skip, take);
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/news failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await enforceRouteAuth('/api/news', 'POST');
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const parsed = NewsCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const result = await createNews(auth.userId, {
      ...parsed.data,
      links: parsed.data.links ?? null,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'POST /api/news failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
