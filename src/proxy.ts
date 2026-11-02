import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Pages that require any authenticated user
const AUTHENTICATED_PAGE_PREFIXES = ['/admin', '/manage', '/user'];

// API route prefixes where EVERY method requires authentication (defense-in-depth;
// per-handler enforceRouteAuth() is the authoritative check for all other routes).
// Only include prefixes where all routes underneath are loggedIn:true; prefixes
// with mixed public/protected methods must not appear here or they would block
// public GETs at the edge.
const AUTHENTICATED_API_PREFIXES = [
  '/api/admin',  // all admin routes require ADMIN role
  '/api/links',  // all links routes require loggedIn:true
];

// ---------------------------------------------------------------------------
// Nonce + CSP
// ---------------------------------------------------------------------------

/**
 * Generate a 128-bit cryptographically random base64 nonce.
 * Uses the Web Crypto API available in the Next.js Edge Runtime.
 */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

/**
 * Build the Content-Security-Policy header value.
 *
 * Production:  strict nonce-based policy; no unsafe-inline, no unsafe-eval.
 * Development: permissive policy to allow HMR and dev-tool overlay scripts.
 *
 * When you add a <Script> or inline <script> in a Server Component, read the
 * nonce with: `const nonce = (await headers()).get('x-nonce') ?? ''`
 * and pass it as `nonce={nonce}` on the element.
 */
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development';
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : `script-src 'self' 'nonce-${nonce}'`;

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    // "img-src 'self' data: blob: https://*.wikimedia.org https://commons.wikimedia.org",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'self'",
  ].join('; ');
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

function getTokenFromRequest(request: NextRequest): string | undefined {
  return request.cookies.get('polpal_token')?.value;
}

async function verifyToken(token: string): Promise<boolean> {
  const secret = process.env.KEY_ENCRYPTION;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ['HS256'] });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Proxy entry point
// ---------------------------------------------------------------------------

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  // Forward nonce to Server Components via request header.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  // Next.js reads CSP from request headers to extract and apply the nonce to
  // its own <script> tags.  Without this, scripts render without a nonce
  // attribute and the browser blocks them.
  requestHeaders.set('Content-Security-Policy', csp);

  const { pathname } = request.nextUrl;

  const isProtectedPage = AUTHENTICATED_PAGE_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  const isProtectedApi = AUTHENTICATED_API_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isProtectedPage || isProtectedApi) {
    const token = getTokenFromRequest(request);
    const isValid = token ? await verifyToken(token) : false;

    if (!isValid) {
      if (isProtectedApi) {
        const response = NextResponse.json({ message: 'Authentication required' }, { status: 401 });
        response.headers.set('Content-Security-Policy', csp);
        return response;
      }
      const loginUrl = new URL('/authentication/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.headers.set('Content-Security-Policy', csp);
      return response;
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except Next.js internals and static assets.
     * This ensures every page/API response gets the CSP header with a fresh nonce.
     */
    '/((?!_next/static|_next/image|favicon\\.ico).*)',
  ],
};
