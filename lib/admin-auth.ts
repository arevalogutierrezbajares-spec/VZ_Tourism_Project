import { NextRequest, NextResponse } from 'next/server';

/**
 * Checks that the request carries a valid admin token (cookie or X-Admin-Token header).
 * Returns a 401 NextResponse if auth fails, or null if auth passes.
 *
 * The admin_token cookie stores the SHA-256 hash of the admin password.
 * The ADMIN_PASSWORD env var should also be set to the same SHA-256 hash.
 *
 * TODO: Replace with real session/JWT auth once provider accounts are implemented.
 */
export function requireAdminAuth(request: NextRequest): NextResponse | null {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    // Auth not configured — deny all access to admin endpoints
    console.error('[admin-auth] ADMIN_PASSWORD environment variable is not set');
    return NextResponse.json(
      { error: 'Service unavailable' },
      { status: 503 }
    );
  }

  const cookieToken = request.cookies.get('admin_token')?.value;
  const headerToken = request.headers.get('x-admin-token');
  const token = cookieToken || headerToken;

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized — admin token required' },
      { status: 401 }
    );
  }

  // Constant-time comparison to prevent timing attacks
  if (token.length !== adminPassword.length) {
    return NextResponse.json(
      { error: 'Unauthorized — invalid admin token' },
      { status: 401 }
    );
  }

  // Simple constant-time string comparison
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ adminPassword.charCodeAt(i);
  }

  if (mismatch !== 0) {
    return NextResponse.json(
      { error: 'Unauthorized — invalid admin token' },
      { status: 401 }
    );
  }

  return null; // Authorized
}
