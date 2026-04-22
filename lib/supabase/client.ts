'use client';

import { createBrowserClient } from '@supabase/ssr';

// Singleton — prevents navigator.locks contention when multiple hooks/components
// each create their own client (React Strict Mode double-mount makes this worse).
let _client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error(
      '[Supabase] createClient(): missing env vars — ' +
        'NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. ' +
        'Authentication will not work until these are defined.'
    );
    return null;
  }
  _client = createBrowserClient(url, key, {
    isSingleton: true,
    auth: {
      flowType: 'pkce',
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  return _client;
}
