import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { createProject, getAllProjectDatasets } from '@/modules/projects/projects.service';
import { ProjectCreateSchema } from '@/modules/projects/projects.schema';
import logger from '@/lib/server/logger.server';

export async function POST(request: Request) {
  const auth = await enforceRouteAuth('/api/projects', 'POST');
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const parsed = ProjectCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const result = await createProject(parsed.data, auth.userId);
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'POST /api/projects failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  const _auth = await enforceRouteAuth('/api/projects', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const projects = await getAllProjectDatasets();
    return NextResponse.json(projects);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/projects failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
