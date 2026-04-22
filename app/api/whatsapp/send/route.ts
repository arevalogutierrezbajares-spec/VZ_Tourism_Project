import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppText } from '@/lib/whatsapp-api';
import { getWhatsAppToken } from '@/lib/whatsapp/token';
import { rateLimit } from '@/lib/api/rate-limit';
import { getAuthenticatedProvider } from '@/lib/whatsapp/dev-auth';
import { SendMessageSchema } from '@/lib/whatsapp/schemas';

/**
 * POST /api/whatsapp/send
 * Human HITL: send a message manually from the provider dashboard.
 * Body: { conversation_id: string, body: string }
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedProvider();
  if (!auth.ok) return auth.response;
  const { supabase, providerId } = auth;

  // Rate limit: 10 messages/minute per provider
  const rateLimitRes = await rateLimit(`ws:${providerId}`, 10);
  if (rateLimitRes) return rateLimitRes;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = SendMessageSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }
  const { conversation_id, body: messageBody } = parsed.data;

  // Fetch conversation (validates ownership via RLS)
  const { data: conv } = await supabase
    .from('wa_conversations')
    .select('id, guest_phone, provider_id, status')
    .eq('id', conversation_id)
    .eq('provider_id', providerId)
    .single();

  if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

  // Fetch WhatsApp config for this provider
  const { data: config } = await supabase
    .from('posada_whatsapp_config')
    .select('phone_number_id, access_token, access_token_vault_id')
    .eq('provider_id', providerId)
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
    console.error('[whatsapp/send] WhatsApp API error:', result.error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 502 });
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

  if (msgError) {
    console.error('[whatsapp/send] message insert failed:', msgError.message);
    return NextResponse.json({ error: 'Failed to persist message' }, { status: 500 });
  }

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
