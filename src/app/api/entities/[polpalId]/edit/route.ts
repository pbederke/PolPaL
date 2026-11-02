import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getUpdatePolpalId } from '@/modules/entities/entities.service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ polpalId: string }> }
) {
  const auth = await enforceRouteAuth('/api/entities/[polpalId]/edit', 'GET');
  if (auth instanceof NextResponse) return auth;
  try {
    const { polpalId } = await params;
    const id = Number(polpalId);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid PolPaL ID' }, { status: 400 });
    const data = await getUpdatePolpalId(id);
    if (data === null || data === undefined) return NextResponse.json({ message: 'Entity not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
