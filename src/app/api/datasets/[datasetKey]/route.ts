import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getDatasetInfos, updateDataset, deleteDataset } from '@/modules/datasets/datasets.service';
import { DatasetUpdateSchema } from '@/modules/datasets/datasets.schema';
import logger from '@/lib/server/logger.server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ datasetKey: string }> }
) {
  const _auth = await enforceRouteAuth('/api/datasets/[datasetKey]', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const { datasetKey } = await params;
    const data = await getDatasetInfos(datasetKey);
    if (!data) return NextResponse.json({ message: 'Dataset not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/datasets/[datasetKey] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ datasetKey: string }> }
) {
  const auth = await enforceRouteAuth('/api/datasets/[datasetKey]', 'PUT');
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const { datasetKey } = await params;
    const parsed = DatasetUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const updated = await updateDataset(datasetKey, parsed.data, auth.userId);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    logger.error({ err: error }, 'PUT /api/datasets/[datasetKey] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ datasetKey: string }> }
) {
  const auth = await enforceRouteAuth('/api/datasets/[datasetKey]', 'DELETE');
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const { datasetKey } = await params;
    let comment: string | undefined;
    try { const b = await request.json(); if (typeof b?.comment === 'string') comment = b.comment.trim().slice(0, 1000) || undefined; } catch { /* no body */ }
    await deleteDataset(datasetKey, auth.userId, comment);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'DELETE /api/datasets/[datasetKey] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
