import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getDatasetVersions } from '@/modules/datasets/datasets.service';
import logger from '@/lib/server/logger.server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ datasetKey: string }> }
) {
  const _auth = await enforceRouteAuth('/api/datasets/[datasetKey]/versions', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const { datasetKey } = await params;
    const data = await getDatasetVersions(datasetKey);
    if (!data) return NextResponse.json({ message: 'Dataset not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/datasets/[datasetKey]/versions failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
