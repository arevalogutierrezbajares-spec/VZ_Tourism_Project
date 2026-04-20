import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProvider } from '@/lib/whatsapp/dev-auth';

interface Params { params: Promise<{ id: string }> }

/**
 * GET /api/whatsapp/conversations/[id]
 * Returns a single conversation with its messages and escalations.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await getAuthenticatedProvider();
  if (!auth.ok) return auth.response;
  const { supabase, providerId } = auth;

  const { data: conversation, error } = await supabase
    .from('wa_conversations')
    .select('*, messages:wa_messages(* ORDER BY created_at ASC), escalations:wa_escalations(* ORDER BY created_at DESC)')
    .eq('id', id)
    .eq('provider_id', providerId)
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
  const auth = await getAuthenticatedProvider();
  if (!auth.ok) return auth.response;
  const { supabase, providerId } = auth;

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
    .eq('provider_id', providerId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
