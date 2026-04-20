import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

const PMS_API_URL = process.env.PMS_API_URL || 'http://localhost:3001';
const PMS_BRIDGE_SECRET = process.env.PMS_BRIDGE_SECRET;
const PMS_TOKEN_COOKIE = 'pms_token';
const PMS_PROPERTY_COOKIE = 'pms_property_id';

/**
 * Get or create a PMS JWT for the current Supabase user.
 * Caches the token in an httpOnly cookie.
 */
async function getPmsToken(supabaseUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }): Promise<{
  token: string;
  propertyId: string | null;
  properties: { id: string; name: string; role: string }[];
} | null> {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(PMS_TOKEN_COOKIE)?.value;
  const existingPropertyId = cookieStore.get(PMS_PROPERTY_COOKIE)?.value;

  if (existingToken) {
    return { token: existingToken, propertyId: existingPropertyId || null, properties: [] };
  }

  if (!PMS_BRIDGE_SECRET) {
    throw new Error('PMS_BRIDGE_SECRET environment variable is not set');
  }

  // Call PMS bridge endpoint to get a JWT
  const name =
    (supabaseUser.user_metadata?.full_name as string) ||
    (supabaseUser.user_metadata?.name as string) ||
    supabaseUser.email?.split('@')[0] ||
    'Provider';

  const res = await fetch(`${PMS_API_URL}/auth/bridge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_secret: PMS_BRIDGE_SECRET,
      supabase_user_id: supabaseUser.id,
      email: supabaseUser.email,
      name,
    }),
  });

  if (!res.ok) {
    return null;
  }

  const data = await res.json() as {
    accessToken: string;
    user: { id: string; defaultPropertyId?: string };
    properties: { id: string; name: string; role: string }[];
  };

  // Store token in httpOnly cookie (7 day expiry matching PMS JWT)
  cookieStore.set(PMS_TOKEN_COOKIE, data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 6 * 24 * 60 * 60, // 6 days (refresh before JWT expires)
  });

  if (data.user.defaultPropertyId) {
    cookieStore.set(PMS_PROPERTY_COOKIE, data.user.defaultPropertyId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 6 * 24 * 60 * 60,
    });
  }

  return {
    token: data.accessToken,
    propertyId: data.user.defaultPropertyId || null,
    properties: data.properties,
  };
}

/**
 * Proxy a request to the PMS NestJS API.
 */
async function proxyToPms(
  request: NextRequest,
  method: string,
  path: string,
) {
  // Dev-only: bypass auth and proxy directly to PMS
  const isDev = process.env.DEV_SKIP_AUTH === 'true' && process.env.NODE_ENV === 'development';

  let pmsHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  let propertyId: string | null = request.headers.get('x-pms-property-id');

  if (!isDev) {
    // Authenticate via Supabase
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check provider role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'provider' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden — provider role required' }, { status: 403 });
    }

    // Get PMS token
    let pmsAuth: Awaited<ReturnType<typeof getPmsToken>>;
    try {
      pmsAuth = await getPmsToken(user);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'PMS configuration error';
      return NextResponse.json({ error: message }, { status: 503 });
    }
    if (!pmsAuth) {
      return NextResponse.json({ error: 'PMS authentication failed' }, { status: 502 });
    }

    pmsHeaders['Authorization'] = `Bearer ${pmsAuth.token}`;
    propertyId = propertyId || pmsAuth.propertyId;
  } else {
    // Dev mode: use bridge to get a token for a default dev user
    const bridgeRes = await fetch(`${PMS_API_URL}/auth/bridge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_secret: PMS_BRIDGE_SECRET || 'dev-bridge-secret',
        supabase_user_id: 'dev-user-001',
        email: 'dev@localhost',
        name: 'Dev User',
      }),
    });
    if (bridgeRes.ok) {
      const data = await bridgeRes.json() as { accessToken: string; user: { defaultPropertyId?: string } };
      pmsHeaders['Authorization'] = `Bearer ${data.accessToken}`;
      propertyId = propertyId || data.user.defaultPropertyId || null;
    }
  }

  if (propertyId) {
    pmsHeaders['X-Property-Id'] = propertyId;
  }

  // Build headers for PMS API
  const headers = pmsHeaders;

  // Build the PMS API URL
  const pmsUrl = `${PMS_API_URL}/${path}${request.nextUrl.search}`;

  // Get request body for non-GET requests
  let body: string | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      body = await request.text();
    } catch {
      // No body
    }
  }

  // Proxy the request
  const pmsResponse = await fetch(pmsUrl, {
    method,
    headers,
    body: body || undefined,
  });

  // Return the PMS response
  if (pmsResponse.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const responseData = await pmsResponse.text();

  return new NextResponse(responseData, {
    status: pmsResponse.status,
    headers: {
      'Content-Type': pmsResponse.headers.get('Content-Type') || 'application/json',
    },
  });
}

function sanitizePath(pathSegments: string[]): string | null {
  // Reject any segment that is '..' or starts with '.'
  if (pathSegments.some(seg => seg === '..' || seg.startsWith('.'))) {
    return null;
  }
  return pathSegments.map(encodeURIComponent).join('/');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const safePath = sanitizePath(path);
  if (!safePath) return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  return proxyToPms(request, 'GET', safePath);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const safePath = sanitizePath(path);
  if (!safePath) return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  return proxyToPms(request, 'POST', safePath);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const safePath = sanitizePath(path);
  if (!safePath) return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  return proxyToPms(request, 'PATCH', safePath);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const safePath = sanitizePath(path);
  if (!safePath) return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  return proxyToPms(request, 'PUT', safePath);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const safePath = sanitizePath(path);
  if (!safePath) return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  return proxyToPms(request, 'DELETE', safePath);
}
