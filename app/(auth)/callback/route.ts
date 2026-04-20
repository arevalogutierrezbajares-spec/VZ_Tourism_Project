import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // Decode next in case it was double-encoded via encodeURIComponent
  const rawNext = searchParams.get('next') ?? '/';
  const next = rawNext.startsWith('/') ? rawNext : `/${rawNext}`;

  if (code) {
    const supabase = await createClient();
    if (!supabase) {
      console.error('[Auth] callback: createClient() returned null — check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    } else {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.session) {
        // Upsert the user row immediately after OAuth so there's no race condition
        // where the client loads before the DB trigger has created the row.
        const authUser = data.session.user;
        await supabase.from('users').upsert(
          {
            id: authUser.id,
            email: authUser.email ?? '',
            full_name:
              authUser.user_metadata?.full_name ??
              authUser.user_metadata?.name ??
              authUser.email ??
              '',
            avatar_url: authUser.user_metadata?.avatar_url ?? null,
            role: 'tourist',
            preferred_language: 'en',
          },
          { onConflict: 'id', ignoreDuplicates: true }
        );
        return NextResponse.redirect(`${origin}${next}`);
      }
      console.error('[Auth] exchangeCodeForSession failed:', error?.message, error);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
