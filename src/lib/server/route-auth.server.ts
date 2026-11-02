import 'server-only';
import { NextResponse } from 'next/server';
import { requireAuth, type AuthPayload } from './auth.server';
import { ROUTES, type HttpMethod } from '@/app/api/routes.config';
import logger from './logger.server';

/**
 * Looks up authentication requirements for a route from routes.config.ts
 * and enforces them.
 * - Returns null for public routes (loggedIn: false).
 * - Returns AuthPayload for authenticated routes.
 * - Returns NextResponse (401/403) on auth failure.
 * - Returns NextResponse 403 if the route is not found in ROUTES config
 *   (treats unknown routes as forbidden rather than silently accessible).
 */
export async function enforceRouteAuth(
  path: string,
  method: HttpMethod
): Promise<AuthPayload | null | NextResponse> {
  const config = ROUTES.find(r => r.path === path && r.method === method);
  if (!config) {
    logger.error({ path, method }, '[enforceRouteAuth] Route missing from routes.config — treating as forbidden');
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
  if (!config.loggedIn) {
    return null;
  }
  return requireAuth(config.roles ?? undefined, config.requiresApproval);
}
