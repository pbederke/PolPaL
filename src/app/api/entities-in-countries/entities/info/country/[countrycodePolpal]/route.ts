import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntityInfosByCountrycode } from '@/modules/entities-in-countries/entities-in-countries.service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ countrycodePolpal: string }> }
) {
  const _auth = await enforceRouteAuth('/api/entities-in-countries/entities/info/country/[countrycodePolpal]', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const { countrycodePolpal } = await params;
    const data = await getEntityInfosByCountrycode(countrycodePolpal);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
