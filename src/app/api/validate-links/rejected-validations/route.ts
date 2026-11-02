import { NextResponse } from 'next/server';
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import { getRejectedValidations } from '@/modules/validation/validation.service';
import logger from '@/lib/server/logger.server';

export async function GET() {
  const _auth = await enforceRouteAuth('/api/validate-links/rejected-validations', 'GET');
  if (_auth instanceof NextResponse) return _auth;
  try {
    const data = await getRejectedValidations();
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/validate-links/rejected-validations failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
