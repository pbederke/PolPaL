import { NextResponse } from 'next/server';
import { getAuthPayload } from '@/lib/server/auth.server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getVersions, createVersion } from '@/modules/versions/versions.service';
import { VersionCreateSchema } from '@/modules/versions/versions.schema';
import logger from '@/lib/server/logger.server';

export async function GET() {
  const _auth = await enforceRouteAuth('/api/versions', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const auth = await getAuthPayload();
    const data = await getVersions();

    // Unauthenticated users must not see hidden projects, datasets, or versions
    if (!auth) {
      return NextResponse.json(
        data.filter(v => !v.versionIsHidden && !v.datasetIsHidden && !v.projectIsHidden)
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/versions failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await enforceRouteAuth('/api/versions', 'POST');
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const parsed = VersionCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const result = await createVersion(parsed.data, auth.userId);
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'POST /api/versions failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
