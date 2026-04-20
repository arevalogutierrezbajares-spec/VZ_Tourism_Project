import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Route protection middleware.
 *
 * Protected route groups:
 *  - /(provider)/*  → requires authenticated user with role === 'provider'
 *  - /(admin)/*     → requires authenticated user with role === 'admin'
 *  - /(ruta)/*      → requires any authenticated user
 *
 * All other routes pass through without modification.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProviderRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/(provider)');
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/(admin)');
  const isRutaRoute = pathname.startsWith('/ruta') || pathname.startsWith('/(ruta)');

  // Fast-pass: non-protected routes
  if (!isProviderRoute && !isAdminRoute && !isRutaRoute) {
    return NextResponse.next();
  }

  // Skip login pages themselves to avoid redirect loops
  if (pathname === '/login' || pathname === '/admin/login' || pathname === '/auth') {
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured, let the route handle it
  if (!url || !key) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Admin routes ──────────────────────────────────────────────────────────
  if (isAdminRoute) {
    // Allow the login page itself
    if (pathname === '/admin/login') {
      return supabaseResponse;
    }

    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/admin/login';
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check admin role via user metadata or ADMIN_PASSWORD env var
    const isAdmin =
      user.user_metadata?.role === 'admin' ||
      (typeof process.env.ADMIN_USER_ID !== 'undefined' &&
        user.id === process.env.ADMIN_USER_ID);

    if (!isAdmin) {
      // Check role from database via service role would add latency; use metadata only
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/admin/login';
      return NextResponse.redirect(loginUrl);
    }

    return supabaseResponse;
  }

  // ── Provider / dashboard routes ───────────────────────────────────────────
  if (isProviderRoute) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = user.user_metadata?.role as string | undefined;
    if (role && role !== 'provider' && role !== 'admin') {
      // Tourist trying to access provider dashboard
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      return NextResponse.redirect(loginUrl);
    }

    return supabaseResponse;
  }

  // ── Ruta routes ───────────────────────────────────────────────────────────
  if (isRutaRoute) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     * - Public assets (files with extensions)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)',
  ],
};
