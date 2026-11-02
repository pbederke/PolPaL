import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getVersionInfos, updateVersion, deleteVersion } from '@/modules/versions/versions.service';
import { VersionUpdateSchema } from '@/modules/versions/versions.schema';
import logger from '@/lib/server/logger.server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ versionKey: string }> }
) {
  const _auth = await enforceRouteAuth('/api/versions/[versionKey]', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const { versionKey } = await params;
    const data = await getVersionInfos(versionKey);
    if (!data) return NextResponse.json({ message: 'Version not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/versions/[versionKey] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ versionKey: string }> }
) {
  const auth = await enforceRouteAuth('/api/versions/[versionKey]', 'PUT');
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const { versionKey } = await params;
    const parsed = VersionUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const result = await updateVersion(versionKey, parsed.data, auth.userId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    logger.error({ err: error }, 'PUT /api/versions/[versionKey] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ versionKey: string }> }
) {
  const auth = await enforceRouteAuth('/api/versions/[versionKey]', 'DELETE');
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const { versionKey } = await params;
    let comment: string | undefined;
    try { const b = await request.json(); if (typeof b?.comment === 'string') comment = b.comment.trim().slice(0, 1000) || undefined; } catch { /* no body */ }
    await deleteVersion(versionKey, auth.userId, comment);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'DELETE /api/versions/[versionKey] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
