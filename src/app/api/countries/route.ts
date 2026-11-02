import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getCountries, createCountry } from '@/modules/countries/countries.service';
import { CountryCreateSchema } from '@/modules/countries/countries.schema';
import logger from '@/lib/server/logger.server';
import { Prisma } from '@prisma/client';

export async function GET() {
  const _auth = await enforceRouteAuth('/api/countries', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const data = await getCountries();
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/countries failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await enforceRouteAuth('/api/countries', 'POST');
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const parsed = CountryCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const country = await createCountry(parsed.data, auth.userId);
    return NextResponse.json(country, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ message: 'countrycodePolpal already assigned to another country' }, { status: 409 });
    }
    logger.error({ err: error }, 'POST /api/countries failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
