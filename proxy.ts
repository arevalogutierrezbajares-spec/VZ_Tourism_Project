import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip Supabase auth when not configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }

  // Skip auth pages to avoid redirect loops
  if (pathname === '/login' || pathname === '/register' || pathname === '/admin/login' || pathname === '/auth') {
    const { supabaseResponse, user } = await updateSession(request);
    // Redirect authenticated users away from login/register
    if (user && (pathname === '/login' || pathname === '/register')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return supabaseResponse;
  }

  const isProviderRoute = pathname.startsWith('/dashboard');
  const isAdminRoute = pathname.startsWith('/admin');
  const isRutaRoute = pathname.startsWith('/ruta');

  // Fast-pass: non-protected routes
  if (!isProviderRoute && !isAdminRoute && !isRutaRoute) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  const { supabaseResponse, user } = await updateSession(request);

  // ── Admin routes ──────────────────────────────────────────────────────────
  if (isAdminRoute) {
    if (!user) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const isAdmin =
      user.user_metadata?.role === 'admin' ||
      (process.env.ADMIN_USER_ID && user.id === process.env.ADMIN_USER_ID);

    if (!isAdmin) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    return supabaseResponse;
  }

  // ── Provider / dashboard routes ───────────────────────────────────────────
  if (isProviderRoute) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = user.user_metadata?.role as string | undefined;
    if (role && role !== 'provider' && role !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return supabaseResponse;
  }

  // ── Ruta routes ───────────────────────────────────────────────────────────
  if (isRutaRoute) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)',
  ],
};
