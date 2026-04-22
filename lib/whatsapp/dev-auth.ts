import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const DEV_PROVIDER_ID = process.env.DEV_PROVIDER_ID;

type AuthResult =
  | { ok: true; supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>; providerId: string }
  | { ok: false; response: NextResponse };

/**
 * Authenticates the request and returns a Supabase client + provider ID.
 * In development with DEV_SKIP_AUTH=true, uses the service client and
 * a hardcoded dev provider to bypass Supabase auth.
 */
export async function getAuthenticatedProvider(): Promise<AuthResult> {
  const isDev = process.env.DEV_SKIP_AUTH === 'true' && process.env.NODE_ENV === 'development';

  if (isDev) {
    if (!DEV_PROVIDER_ID) {
      console.error('[dev-auth] DEV_PROVIDER_ID env var not set');
      return { ok: false, response: NextResponse.json({ error: 'Dev provider not configured' }, { status: 500 }) };
    }
    const supabase = await createServiceClient();
    if (!supabase) return { ok: false, response: NextResponse.json({ error: 'Service unavailable' }, { status: 503 }) };
    return { ok: true, supabase, providerId: DEV_PROVIDER_ID };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, response: NextResponse.json({ error: 'Service unavailable' }, { status: 503 }) };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: provider } = await supabase
    .from('providers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!provider) return { ok: false, response: NextResponse.json({ error: 'Provider not found' }, { status: 404 }) };

  return { ok: true, supabase, providerId: provider.id };
}
