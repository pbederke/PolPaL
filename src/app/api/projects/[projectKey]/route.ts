import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getProjectInfos, updateProject, deleteProject } from '@/modules/projects/projects.service';
import { ProjectUpdateSchema } from '@/modules/projects/projects.schema';
import logger from '@/lib/server/logger.server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectKey: string }> }
) {
  const _auth = await enforceRouteAuth('/api/projects/[projectKey]', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const { projectKey } = await params;
    const data = await getProjectInfos(projectKey);
    if (!data) return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/projects/[projectKey] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectKey: string }> }
) {
  const auth = await enforceRouteAuth('/api/projects/[projectKey]', 'PUT');
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const { projectKey } = await params;
    const parsed = ProjectUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const result = await updateProject(projectKey, parsed.data, auth.userId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    logger.error({ err: error }, 'PUT /api/projects/[projectKey] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectKey: string }> }
) {
  const auth = await enforceRouteAuth('/api/projects/[projectKey]', 'DELETE');
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const { projectKey } = await params;
    let comment: string | undefined;
    try { const b = await request.json(); if (typeof b?.comment === 'string') comment = b.comment.trim().slice(0, 1000) || undefined; } catch { /* no body */ }
    await deleteProject(projectKey, auth.userId, comment);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'DELETE /api/projects/[projectKey] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
