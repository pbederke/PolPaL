import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getProjectDatasets } from '@/modules/projects/projects.service';
import logger from '@/lib/server/logger.server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectKey: string }> }
) {
  const _auth = await enforceRouteAuth('/api/projects/[projectKey]/datasets', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const { projectKey } = await params;
    const data = await getProjectDatasets(projectKey);
    if (!data) return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/projects/[projectKey]/datasets failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
