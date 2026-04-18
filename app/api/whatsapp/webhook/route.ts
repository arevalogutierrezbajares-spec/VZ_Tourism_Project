import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { parseWebhookPayload, sendWhatsAppText, markWhatsAppRead } from '@/lib/whatsapp-api';
import { analyzeMessage } from '@/lib/sentiment';
import { generateReply, getBotQuestionResponse } from '@/lib/whatsapp-ai';
import type { PosadaWhatsappConfig, WaMessage } from '@/types/database';

// ─── Webhook verification (Meta GET challenge) ────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode      = searchParams.get('hub.mode');
  const token     = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode !== 'subscribe' || !challenge) {
    return new NextResponse('Bad Request', { status: 400 });
  }

  // Look up the config row where verify_token matches
  const supabase = await createServiceClient();
  if (!supabase) return new NextResponse('Service unavailable', { status: 503 });

  const { data: config } = await supabase
    .from('posada_whatsapp_config')
    .select('id')
    .eq('verify_token', token)
    .single();

  if (!config) return new NextResponse('Forbidden', { status: 403 });

  return new NextResponse(challenge, { status: 200 });
}

// ─── Inbound message handler ──────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Always acknowledge Meta immediately (must be within 20s)
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ status: 'ok' });
  }

  // Process asynchronously — do not await so we respond to Meta instantly
  processInbound(payload).catch((err) =>
    console.error('[whatsapp/webhook] processInbound error:', err)
  );

  return NextResponse.json({ status: 'ok' });
}

async function processInbound(payload: unknown) {
  const supabase = await createServiceClient();
  if (!supabase) return;

  const messages = parseWebhookPayload(payload);
  if (!messages.length) return;

  for (const msg of messages) {
    try {
      await handleMessage(supabase, msg);
    } catch (err) {
      console.error('[whatsapp/webhook] handleMessage error:', err, msg);
    }
  }
}

async function handleMessage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  msg: Awaited<ReturnType<typeof parseWebhookPayload>>[number]
) {
  const { phoneNumberId, from, guestName, waMessageId, body } = msg;

  // 1. Look up posada config by phone_number_id
  const { data: config } = await supabase
    .from('posada_whatsapp_config')
    .select('*, providers(id, business_name, description, region)')
    .eq('phone_number_id', phoneNumberId)
    .single() as { data: (PosadaWhatsappConfig & { providers: { id: string; business_name: string; description: string; region: string } }) | null };

  if (!config) return; // Unknown number — ignore

  const provider = config.providers;

  // 2. Upsert conversation
  const { data: conv } = await supabase
    .from('wa_conversations')
    .upsert(
      { provider_id: provider.id, guest_phone: from, guest_name: guestName },
      { onConflict: 'provider_id,guest_phone', ignoreDuplicates: false }
    )
    .select('id, status')
    .single();

  if (!conv) return;

  // 3. Dedup: skip if wa_message_id already stored
  const { count } = await supabase
    .from('wa_messages')
    .select('id', { count: 'exact', head: true })
    .eq('wa_message_id', waMessageId);

  if (count && count > 0) return;

  // 4. Sentiment analysis
  const sentiment = analyzeMessage(body);

  // 5. Persist inbound message
  await supabase.from('wa_messages').insert({
    conversation_id: conv.id,
    wa_message_id: waMessageId,
    role: 'inbound',
    content: body,
    is_ai: false,
    flagged: sentiment.flagged,
    flag_reason: sentiment.flag_reason,
    sentiment_score: sentiment.score,
  });

  // 6. Update conversation preview + unread count
  await supabase
    .from('wa_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: body.slice(0, 120),
      guest_name: guestName ?? undefined,
      unread_count: supabase.rpc('increment', { x: 1 }), // simple counter; fallback below
    })
    .eq('id', conv.id);

  // Fallback unread increment (rpc may not exist yet)
  await supabase.rpc('increment_wa_unread', { conv_id: conv.id }).catch(() =>
    supabase.from('wa_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conv.id)
  );

  // 7. If conversation is in human or closed mode — skip AI
  if (conv.status === 'human' || conv.status === 'closed') return;

  // 8. If flagged — escalate and skip AI reply
  if (sentiment.flagged) {
    await supabase.from('wa_conversations').update({ status: 'escalated' }).eq('id', conv.id);
    await supabase.from('wa_escalations').insert({
      conversation_id: conv.id,
      reason: `Flagged message: ${sentiment.flag_reason}`,
      trigger_type: 'sentiment',
    });
    return;
  }

  // 9. If AI is disabled on this posada — skip
  if (!config.ai_enabled) return;

  // 10. Bot-question detected — send standard response + escalate
  if (sentiment.is_bot_question) {
    const botReply = getBotQuestionResponse(
      config.persona_name,
      provider.business_name,
      config.tone_language
    );
    await sendAndPersist(supabase, conv.id, config, from, botReply, true);

    await supabase.from('wa_conversations').update({ status: 'escalated' }).eq('id', conv.id);
    await supabase.from('wa_escalations').insert({
      conversation_id: conv.id,
      reason: 'Guest asked if speaking to a bot',
      trigger_type: 'bot_question',
    });
    return;
  }

  // 11. Load recent conversation history for context
  const { data: history } = await supabase
    .from('wa_messages')
    .select('id, role, content, is_ai, created_at')
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: true })
    .limit(20) as { data: WaMessage[] | null };

  // 12. Generate AI reply via Groq
  const reply = await generateReply({
    config,
    providerName: provider.business_name,
    providerDescription: provider.description,
    providerRegion: provider.region,
    inboundText: body,
    history: (history ?? []).filter((m) => m.id !== undefined),
  });

  // 13. Send + persist outbound
  await sendAndPersist(supabase, conv.id, config, from, reply, true);

  // 14. Mark inbound as read
  await markWhatsAppRead({
    phoneNumberId: config.phone_number_id,
    accessToken: config.access_token,
    messageId: waMessageId,
  });
}

async function sendAndPersist(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  convId: string,
  config: PosadaWhatsappConfig,
  to: string,
  body: string,
  isAi: boolean
) {
  const result = await sendWhatsAppText({
    phoneNumberId: config.phone_number_id,
    accessToken: config.access_token,
    to,
    body,
  });

  await supabase.from('wa_messages').insert({
    conversation_id: convId,
    wa_message_id: result.messageId ?? null,
    role: 'outbound',
    content: body,
    is_ai: isAi,
    flagged: false,
  });

  await supabase
    .from('wa_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: `→ ${body.slice(0, 100)}`,
    })
    .eq('id', convId);
}
