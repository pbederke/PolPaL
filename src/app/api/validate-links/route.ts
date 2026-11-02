import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import logger from '@/lib/server/logger.server';
import { ValidateLinkSchema, DeleteValidateLinkSchema } from '@/modules/validation/validation.schema';
import {
  deleteVerification,
  getLinkVerificationSummary,
  upsertLinkValidation,
} from '@/modules/validation/validation.service';

export async function POST(request: Request) {
  const auth = (await enforceRouteAuth('/api/validate-links', 'POST'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const parsed = ValidateLinkSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }

    const result = await upsertLinkValidation({
      linkId: parsed.data.linkId,
      userId: auth.userId,
      validated: parsed.data.validated,
      comment: parsed.data.comment,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Link not found') {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'Cannot validate own link') {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    logger.error({ err: error }, 'POST /api/validate-links failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const auth = await enforceRouteAuth('/api/validate-links', 'GET');
  if (auth instanceof NextResponse) return auth;
  try {
    const url = new URL(request.url);
    const linkIdParam = url.searchParams.get('linkId');
    const linkId = Number(linkIdParam);

    if (!linkIdParam || !Number.isInteger(linkId) || linkId <= 0) {
      return NextResponse.json({ message: 'Invalid linkId query parameter' }, { status: 400 });
    }

    const result = await getLinkVerificationSummary(linkId);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Link not found') {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    logger.error({ err: error }, 'GET /api/validate-links failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = (await enforceRouteAuth('/api/validate-links', 'DELETE'))!;
  if (auth instanceof NextResponse) return auth;
  try {
    const parsed = DeleteValidateLinkSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }

    await deleteVerification(parsed.data.linkId, auth.userId);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'DELETE /api/validate-links failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
