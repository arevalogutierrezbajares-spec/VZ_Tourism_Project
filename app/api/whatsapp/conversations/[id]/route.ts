import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface Params { params: Promise<{ id: string }> }

/**
 * GET /api/whatsapp/conversations/[id]
 * Returns a single conversation with its messages and escalations.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: provider } = await supabase
    .from('providers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });

  const { data: conversation, error } = await supabase
    .from('wa_conversations')
    .select('*, messages:wa_messages(* ORDER BY created_at ASC), escalations:wa_escalations(* ORDER BY created_at DESC)')
    .eq('id', id)
    .eq('provider_id', provider.id)
    .single();

  if (error || !conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  // Clear unread count
  await supabase.from('wa_conversations').update({ unread_count: 0 }).eq('id', id);

  return NextResponse.json({ data: conversation });
}

/**
 * PATCH /api/whatsapp/conversations/[id]
 * Update conversation status, booking_stage, or notes.
 * Body: { status?, booking_stage?, notes? }
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: provider } = await supabase
    .from('providers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });

  let body: { status?: string; booking_stage?: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const allowed = ['status', 'booking_stage', 'notes'];
  const updates = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  );

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('wa_conversations')
    .update(updates)
    .eq('id', id)
    .eq('provider_id', provider.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
