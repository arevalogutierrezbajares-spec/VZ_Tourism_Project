import { NextRequest, NextResponse } from 'next/server';

/**
 * Checks that the request carries a valid admin token (cookie or X-Admin-Token header).
 * Returns a 401 NextResponse if auth fails, or null if auth passes.
 *
 * TODO: Replace with real session/JWT auth once provider accounts are implemented.
 */
export function requireAdminAuth(request: NextRequest): NextResponse | null {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    // Auth not configured — deny all access to financial endpoints
    return NextResponse.json(
      { error: 'Server misconfiguration: ADMIN_PASSWORD not set' },
      { status: 500 }
    );
  }

  const cookieToken = request.cookies.get('admin_token')?.value;
  const headerToken = request.headers.get('x-admin-token');

  if (cookieToken === adminPassword || headerToken === adminPassword) {
    return null; // Authorized
  }

  return NextResponse.json(
    { error: 'Unauthorized — admin token required' },
    { status: 401 }
  );
}
