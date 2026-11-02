import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { deleteEntitiesInCountries } from '@/modules/entities-in-countries/entities-in-countries.service';
import logger from '@/lib/server/logger.server';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ entitiesInCountriesId: string }> }
) {
  const auth = (await enforceRouteAuth('/api/entities-in-countries/[entitiesInCountriesId]', 'DELETE'))!;
  if (auth instanceof NextResponse) return auth;
  const { entitiesInCountriesId } = await params;
  const id = Number(entitiesInCountriesId);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
  try {
    let comment: string | undefined;
    try { const b = await request.json(); if (typeof b?.comment === 'string') comment = b.comment.trim().slice(0, 1000) || undefined; } catch { /* no body */ }
    await deleteEntitiesInCountries(id, auth.userId, comment);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'DELETE /api/entities-in-countries/[id] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
