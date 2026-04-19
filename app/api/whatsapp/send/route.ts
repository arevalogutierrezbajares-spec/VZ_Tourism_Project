import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendWhatsAppText } from '@/lib/whatsapp-api';
import { getWhatsAppToken } from '@/lib/whatsapp/token';

/**
 * POST /api/whatsapp/send
 * Human HITL: send a message manually from the provider dashboard.
 * Body: { conversation_id: string, body: string }
 */
export async function POST(request: NextRequest) {
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

  let body: { conversation_id?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { conversation_id, body: messageBody } = body;
  if (!conversation_id || !messageBody?.trim()) {
    return NextResponse.json({ error: 'conversation_id and body are required' }, { status: 400 });
  }

  // Fetch conversation (validates ownership via RLS)
  const { data: conv } = await supabase
    .from('wa_conversations')
    .select('id, guest_phone, provider_id, status')
    .eq('id', conversation_id)
    .eq('provider_id', provider.id)
    .single();

  if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

  // Fetch WhatsApp config for this provider
  const { data: config } = await supabase
    .from('posada_whatsapp_config')
    .select('phone_number_id, access_token, access_token_vault_id')
    .eq('provider_id', provider.id)
    .single();

  if (!config) {
    return NextResponse.json({ error: 'WhatsApp not configured for this provider' }, { status: 400 });
  }

  // Decrypt token (Vault if available, plaintext fallback)
  const accessToken = await getWhatsAppToken(supabase, config);

  const result = await sendWhatsAppText({
    phoneNumberId: config.phone_number_id,
    accessToken,
    to: conv.guest_phone,
    body: messageBody.trim(),
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  // Persist outbound message
  const { data: message, error: msgError } = await supabase
    .from('wa_messages')
    .insert({
      conversation_id: conv.id,
      wa_message_id: result.messageId ?? null,
      role: 'outbound',
      content: messageBody.trim(),
      is_ai: false,
      flagged: false,
    })
    .select()
    .single();

  if (msgError) return NextResponse.json({ error: msgError.message }, { status: 500 });

  // Update conversation preview
  await supabase
    .from('wa_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: `→ ${messageBody.slice(0, 100)}`,
      status: 'human', // ensure status reflects human mode
    })
    .eq('id', conv.id);

  return NextResponse.json({ data: message });
}
