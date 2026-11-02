import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getAllDatasetsHomepage } from '@/modules/datasets/datasets.service';
import logger from '@/lib/server/logger.server';

export async function GET() {
  const _auth = await enforceRouteAuth('/api/datasets/homepage', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const data = await getAllDatasetsHomepage();
    if (!data) return NextResponse.json({ message: 'No datasets found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/datasets/homepage failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
