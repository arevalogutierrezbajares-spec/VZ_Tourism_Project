import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip Supabase auth middleware when Supabase is not configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }

  const { supabaseResponse, user } = await updateSession(request);

  // Protect dashboard routes - require provider or admin role
  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Role check happens in layout via server component
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
