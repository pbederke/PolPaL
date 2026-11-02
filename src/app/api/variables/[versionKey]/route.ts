import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getVariablesForVersion, getAvailableVars, createVariable, deleteVariable } from '@/modules/variables/variables.service';
import { VariableCreateSchema } from '@/modules/variables/variables.schema';
import logger from '@/lib/server/logger.server';

interface Params {
  params: Promise<{ versionKey: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const _auth = await enforceRouteAuth('/api/variables/[versionKey]', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  const { versionKey } = await params;

  try {
    const [variables, availableVars] = await Promise.all([
      getVariablesForVersion(versionKey),
      getAvailableVars(versionKey),
    ]);
    return NextResponse.json({ variables, availableVars });
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/variables/[versionKey] failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  const { versionKey } = await params;
  const auth = await enforceRouteAuth('/api/variables/[versionKey]', 'POST');
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = VariableCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const result = await createVariable(versionKey, parsed.data, auth.userId);
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    logger.error({ err: error }, 'POST /api/variables/[versionKey] failed');
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('already exists')) {
      return NextResponse.json({ message: 'Variable already exists for this version.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { versionKey } = await params;
  const auth = await enforceRouteAuth('/api/variables/[versionKey]', 'DELETE');
  if (auth instanceof NextResponse) return auth;
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json() as { variableId?: unknown; comment?: unknown };
    const variableId = Number(body?.variableId);
    if (!Number.isInteger(variableId) || variableId <= 0) {
      return NextResponse.json({ message: 'variableId must be a positive integer' }, { status: 400 });
    }
    const comment = typeof body?.comment === 'string' ? body.comment.trim().slice(0, 1000) || undefined : undefined;
    await deleteVariable(variableId, auth.userId, comment);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    logger.error({ err: error, versionKey }, 'DELETE /api/variables/[versionKey] failed');
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('not found')) {
      return NextResponse.json({ message: 'Variable not found.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
