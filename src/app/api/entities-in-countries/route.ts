import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getEntitiesInCountries, createEntitiesInCountries } from '@/modules/entities-in-countries/entities-in-countries.service';
import { EntityInCountryCreateSchema } from '@/modules/entities-in-countries/entities-in-countries.schema';
import logger from '@/lib/server/logger.server';

export async function GET() {
  const _auth = await enforceRouteAuth('/api/entities-in-countries', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const data = await getEntitiesInCountries();
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/entities-in-countries failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = (await enforceRouteAuth('/api/entities-in-countries', 'POST'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const parsed = EntityInCountryCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const data = {
      ...parsed.data,
      countrycodePolpal: parsed.data.countrycodePolpal.toUpperCase(),
    };
    const result = await createEntitiesInCountries(auth.userId, data);
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'POST /api/entities-in-countries failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
