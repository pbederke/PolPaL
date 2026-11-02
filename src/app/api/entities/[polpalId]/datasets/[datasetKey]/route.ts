import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntityDataset } from '@/modules/entities/entities.service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ polpalId: string; datasetKey: string }> }
) {
  const _auth = await enforceRouteAuth('/api/entities/[polpalId]/datasets/[datasetKey]', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const { polpalId, datasetKey } = await params;
    const id = Number(polpalId);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid PolPaL ID' }, { status: 400 });
    const data = await getEntityDataset(id, datasetKey);
    if (!data) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
