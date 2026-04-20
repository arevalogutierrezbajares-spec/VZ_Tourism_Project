import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Routes that require authentication — redirect to /login?next= if no session
const PROTECTED_ROUTES = ['/trips', '/account', '/bookings', '/messages'];

// Routes that require provider role
const PROVIDER_ROUTES = ['/dashboard'];

// Routes that require admin role
const ADMIN_ROUTES = ['/admin'];

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Check if route requires authentication
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isProvider = PROVIDER_ROUTES.some((r) => pathname.startsWith(r));
  const isAdmin = ADMIN_ROUTES.some((r) => pathname.startsWith(r));

  if ((isProtected || isProvider || isAdmin) && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
