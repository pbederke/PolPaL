import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getNewsById, updateNews, deleteNews } from '@/modules/news/news.service';
import { NewsUpdateSchema } from '@/modules/news/news.schema';
import logger from '@/lib/server/logger.server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ newsId: string }> }
) {
  const _auth = await enforceRouteAuth('/api/news/[newsId]', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const { newsId } = await params;
    const id = Number(newsId);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid news ID' }, { status: 400 });
    const data = await getNewsById(id);
    if (!data) return NextResponse.json({ message: 'News not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/news/[newsId] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ newsId: string }> }
) {
  const auth = (await enforceRouteAuth('/api/news/[newsId]', 'PUT'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const { newsId } = await params;
    const id = Number(newsId);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid news ID' }, { status: 400 });
    const parsed = NewsUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const result = await updateNews(id, parsed.data, auth.userId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    logger.error({ err: error }, 'PUT /api/news/[newsId] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ newsId: string }> }
) {
  const auth = (await enforceRouteAuth('/api/news/[newsId]', 'DELETE'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const { newsId } = await params;
    const id = Number(newsId);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid news ID' }, { status: 400 });
    let comment: string | undefined;
    try { const b = await request.json(); if (typeof b?.comment === 'string') comment = b.comment.trim().slice(0, 1000) || undefined; } catch { /* no body */ }
    await deleteNews(id, auth.userId, comment);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'DELETE /api/news/[newsId] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
