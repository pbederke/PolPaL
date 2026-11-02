import { NextResponse } from 'next/server';
import { getVersionsByCountry } from '@/modules/versions/versions.service';
import logger from '@/lib/server/logger.server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ countrycodePolpal: string }> }
) {
  try {
    const { countrycodePolpal } = await params;
    const data = await getVersionsByCountry(countrycodePolpal);
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error({ err: error }, 'GET /api/countries/[countrycodePolpal]/versions failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
