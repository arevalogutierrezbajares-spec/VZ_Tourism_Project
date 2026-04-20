import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ token: string }>;
}

// GET /api/creator/invite/[token]
// Returns invite metadata (name, email) for the landing page without exposing
// sensitive fields. Used to personalise the invite page before claim.
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  const supabase = await createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });
  }

  const { data: invite, error } = await supabase
    .from('creator_invites')
    .select('invited_name, email, expires_at, claimed_at')
    .eq('token', token)
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: 'Invite not found.' }, { status: 404 });
  }

  if (invite.claimed_at) {
    return NextResponse.json({ error: 'This invite has already been used.' }, { status: 410 });
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite has expired.' }, { status: 410 });
  }

  return NextResponse.json({
    invited_name: invite.invited_name,
    email: invite.email,
    expires_at: invite.expires_at,
  });
}
