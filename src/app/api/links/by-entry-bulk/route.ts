import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { deleteLinkByEntryBulk, createLinksBulk } from '@/modules/links/links.service';
import { BulkDeleteLinksSchema, BulkCreateLinksSchema } from '@/modules/links/links.schema';
import logger from '@/lib/server/logger.server';

export async function DELETE(request: Request) {
  const auth = (await enforceRouteAuth('/api/links/by-entry-bulk', 'DELETE'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const parsed = BulkDeleteLinksSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    await deleteLinkByEntryBulk(parsed.data.listUniqueObservationIds, auth.userId);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'DELETE /api/links/by-entry-bulk failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = (await enforceRouteAuth('/api/links/by-entry-bulk', 'POST'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const parsed = BulkCreateLinksSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const result = await createLinksBulk(parsed.data.entries, auth.userId);
    return NextResponse.json({ message: 'Links created', count: result.created, batchId: result.batchId }, { status: 201 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'POST /api/links/by-entry-bulk failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
