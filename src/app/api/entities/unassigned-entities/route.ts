import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getUnassignedEntities } from '@/modules/entities/entities.service';

export async function GET() {
  const _auth = await enforceRouteAuth('/api/entities/unassigned-entities', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const data = await getUnassignedEntities();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
