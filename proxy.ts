import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Tourist routes that require a logged-in session
// NOTE: These pages also handle unauthenticated state client-side (show "Sign in" UI),
// so only protect routes that truly cannot render without a server session.
// /trips, /account, /messages removed — they work with the client-side demo account.
const PROTECTED_ROUTES: string[] = [];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip Supabase auth middleware when Supabase is not configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }

  const { supabaseResponse, user } = await updateSession(request);

  // Tourist protected routes
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Provider dashboard — redirect unauthenticated users
  if (pathname.startsWith('/dashboard') && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes use client-side password auth in the layout — skip Supabase redirect
  if (pathname.startsWith('/admin')) {
    return supabaseResponse;
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
