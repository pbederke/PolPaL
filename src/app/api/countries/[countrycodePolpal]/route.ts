import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getCountryByCountrycode, updateCountry, deleteCountry } from '@/modules/countries/countries.service';
import { CountryUpdateSchema } from '@/modules/countries/countries.schema';
import logger from '@/lib/server/logger.server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ countrycodePolpal: string }> }
) {
  const _auth = await enforceRouteAuth('/api/countries/[countrycodePolpal]', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const { countrycodePolpal } = await params;
    const country = await getCountryByCountrycode(countrycodePolpal);
    if (!country) return NextResponse.json({ message: 'Country not found' }, { status: 404 });
    return NextResponse.json(country);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/countries/[countrycodePolpal] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ countrycodePolpal: string }> }
) {
  const auth = await enforceRouteAuth('/api/countries/[countrycodePolpal]', 'PUT');
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const { countrycodePolpal } = await params;
    const parsed = CountryUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const updated = await updateCountry(auth.userId, auth.role, countrycodePolpal, parsed.data);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    logger.error({ err: error }, 'PUT /api/countries/[countrycodePolpal] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ countrycodePolpal: string }> }
) {
  const auth = await enforceRouteAuth('/api/countries/[countrycodePolpal]', 'DELETE');
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const { countrycodePolpal } = await params;

    let comment: string | undefined;
    try {
      const body = await request.json();
      if (typeof body?.comment === 'string') comment = body.comment.trim().slice(0, 1000) || undefined;
    } catch {
      // no body
    }

    await deleteCountry(countrycodePolpal, auth.userId, auth.role, comment);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'DELETE /api/countries/[countrycodePolpal] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
