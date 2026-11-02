import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { deleteLinkByEntriesAndPolpalId } from '@/modules/links/links.service';
import { DeleteLinksByEntriesAndPolpalSchema } from '@/modules/links/links.schema';
import logger from '@/lib/server/logger.server';

export async function DELETE(request: Request) {
  const auth = await enforceRouteAuth('/api/links/by-entries-polpal', 'DELETE');
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  try {
    const parsed = DeleteLinksByEntriesAndPolpalSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    await deleteLinkByEntriesAndPolpalId(parsed.data.uniqueObservationIds, parsed.data.polpalId, auth.userId);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'DELETE /api/links/by-entries-polpal failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
