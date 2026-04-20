import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const claimSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

interface RouteParams {
  params: Promise<{ token: string }>;
}

// POST /api/creator/invite/[token]/claim
// Body: { email, password }
// Atomically claims the invite, creates a Supabase auth user, inserts creator_profiles.
// Returns: { redirectUrl: "/creator/onboarding" }
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  const body = await req.json().catch(() => null);
  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const supabase = await createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });
  }

  // ── Step 1: Atomic claim ──────────────────────────────────────────────────
  // UPDATE ... WHERE claimed_at IS NULL returns 0 rows if already claimed.
  // This prevents double-claim races without a separate SELECT.
  const { data: claimed, error: claimError } = await supabase
    .from('creator_invites')
    .update({ claimed_at: new Date().toISOString() })
    .eq('token', token)
    .is('claimed_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('id, invited_name, email')
    .single();

  if (claimError || !claimed) {
    // Either already claimed, expired, or not found — return the same message
    // to avoid leaking which case applies.
    return NextResponse.json(
      { error: 'This invite is no longer valid.' },
      { status: 409 }
    );
  }

  // ── Step 2: Create Supabase auth user ─────────────────────────────────────
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: claimed.invited_name || email.split('@')[0],
    },
  });

  if (authError || !authData.user) {
    // Roll back the claim so the invite can be retried
    await supabase
      .from('creator_invites')
      .update({ claimed_at: null })
      .eq('id', claimed.id);

    const msg = authError?.message?.includes('already registered')
      ? 'An account with this email already exists.'
      : 'Could not create account. Please try again.';
    return NextResponse.json({ error: msg }, { status: 422 });
  }

  const userId = authData.user.id;

  // ── Step 3: Set role = 'creator' in public.users ─────────────────────────
  // handle_new_user trigger fires on auth.users INSERT and creates the row
  // with role = 'tourist'. Update it to 'creator' immediately after.
  const { error: roleError } = await supabase
    .from('users')
    .update({ role: 'creator' })
    .eq('id', userId);

  if (roleError) {
    // Non-fatal: profile creation below will still work; admin can fix role manually.
    console.error('[invite/claim] role update failed:', roleError.message);
  }

  // ── Step 4: Insert creator_profiles ──────────────────────────────────────
  // username is intentionally NULL here — the onboarding wizard sets it.
  const { error: profileError } = await supabase
    .from('creator_profiles')
    .insert({
      user_id: userId,
      commission_rate: 0.08,
    });

  if (profileError) {
    console.error('[invite/claim] creator_profiles insert failed:', profileError.message);
    // Still proceed — onboarding wizard will handle this edge case gracefully.
  }

  // ── Step 5: Record who claimed ────────────────────────────────────────────
  await supabase
    .from('creator_invites')
    .update({ claimed_by: userId })
    .eq('id', claimed.id);

  // ── Step 6: Sign in the new user to establish a session ──────────────────
  // service_role created the user; now we sign them in via anon key
  // by returning the sign-in URL — the client will call signInWithPassword.
  // Simpler: return credentials and let the client handle sign-in.
  return NextResponse.json({
    redirectUrl: '/creator/onboarding',
    email,
    // password NOT returned — client already has it from the form
  });
}
