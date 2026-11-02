import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getAbout, createAbout } from '@/modules/about/about.service';
import { AboutCreateSchema } from '@/modules/about/about.schema';
import logger from '@/lib/server/logger.server';

export async function GET() {
  const _auth = await enforceRouteAuth('/api/about', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const data = await getAbout();
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/about failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await enforceRouteAuth('/api/about', 'POST');
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const parsed = AboutCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const about = await createAbout(parsed.data);
    return NextResponse.json(about, { status: 201 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'POST /api/about failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
