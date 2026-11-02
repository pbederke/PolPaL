import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getVersionsByDatasetKey } from '@/modules/versions/versions.service';
import logger from '@/lib/server/logger.server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ datasetKey: string }> }
) {
  const auth = await enforceRouteAuth('/api/versions/by-dataset/[datasetKey]', 'GET');
  if (auth instanceof NextResponse) return auth;
  try {
    const { datasetKey } = await params;
    const data = await getVersionsByDatasetKey(datasetKey);
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/versions/by-dataset/[datasetKey] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
