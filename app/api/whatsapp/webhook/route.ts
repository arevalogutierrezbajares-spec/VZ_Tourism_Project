import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { createServiceClient } from '@/lib/supabase/server';
import { parseWebhookPayload, sendWhatsAppText, markWhatsAppRead } from '@/lib/whatsapp-api';
import { analyzeMessage } from '@/lib/sentiment';
import { generateReply, getBotQuestionResponse } from '@/lib/whatsapp-ai';
import { buildLiveContext } from '@/lib/whatsapp-context';
import { detectAndTranslate } from '@/lib/whatsapp-translate';
import { getWhatsAppToken } from '@/lib/whatsapp/token';
import type { PosadaWhatsappConfig, PosadaKnowledge, WaMessage } from '@/types/database';

// Regex to extract [NEEDS_HUMAN: <reason>] tag from AI replies.
// Permissive — matches anywhere in the string so the LLM can place it mid-reply.
const NEEDS_HUMAN_RE = /\[NEEDS_HUMAN:\s*([^\]]+)\]/;

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

  // waitUntil tells Vercel to keep the function alive after the response is sent.
  // Without this, serverless kills the process the moment we return 200, silently
  // dropping every inbound message before the AI can reply.
  waitUntil(
    processInbound(payload).catch((err) =>
      console.error('[whatsapp/webhook] processInbound error:', err)
    )
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
    .select('*, access_token_vault_id, providers(id, business_name, description, region)')
    .eq('phone_number_id', phoneNumberId)
    .single() as { data: (PosadaWhatsappConfig & { access_token_vault_id: string | null; providers: { id: string; business_name: string; description: string; region: string } }) | null };

  if (!config) return; // Unknown number — ignore

  // Decrypt access token (Vault if available, plaintext fallback)
  const accessToken = await getWhatsAppToken(supabase, config);

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

  // 4. Sentiment analysis + language detection + translation (run in parallel)
  const [sentiment, translation] = await Promise.all([
    Promise.resolve(analyzeMessage(body)),
    detectAndTranslate(body).catch(() => null),
  ]);

  const detectedLang = translation?.detected.language ?? null;
  const contentEn = translation?.english ?? null; // null = already English

  // 5. Persist inbound message (with language + English trail)
  await supabase.from('wa_messages').insert({
    conversation_id: conv.id,
    wa_message_id: waMessageId,
    role: 'inbound',
    content: body,
    content_en: contentEn,
    detected_lang: detectedLang,
    is_ai: false,
    flagged: sentiment.flagged,
    flag_reason: sentiment.flag_reason,
    sentiment_score: sentiment.score,
  });

  // 6. Update conversation preview + unread count + detected language
  await supabase
    .from('wa_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: body.slice(0, 120),
      guest_name: guestName ?? undefined,
      guest_language: detectedLang ?? undefined,
      unread_count: supabase.rpc('increment', { x: 1 }), // simple counter; fallback below
    })
    .eq('id', conv.id);

  // Fallback unread increment (rpc may not exist yet)
  try {
    await supabase.rpc('increment_wa_unread', { conv_id: conv.id });
  } catch {
    await supabase.from('wa_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conv.id);
  }

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
    await sendAndPersist(supabase, conv.id, config, accessToken, from, botReply, true);

    await supabase.from('wa_conversations').update({ status: 'escalated' }).eq('id', conv.id);
    await supabase.from('wa_escalations').insert({
      conversation_id: conv.id,
      reason: 'Guest asked if speaking to a bot',
      trigger_type: 'bot_question',
    });
    return;
  }

  // 11. Load history + knowledge in parallel (independent queries)
  const [{ data: history }, { data: knowledge }] = await Promise.all([
    supabase
      .from('wa_messages')
      .select('id, role, content, is_ai, created_at')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })
      .limit(20) as Promise<{ data: WaMessage[] | null }>,
    supabase
      .from('posada_knowledge')
      .select('*')
      .eq('provider_id', provider.id)
      .single() as Promise<{ data: PosadaKnowledge | null }>,
  ]);

  // 11c. Build live context (dynamic pricing + availability)
  const liveContext = await buildLiveContext(supabase, provider.id, knowledge).catch(() => undefined);

  // 12. Generate AI reply via Groq
  const rawReply = await generateReply({
    config,
    providerName: provider.business_name,
    providerDescription: provider.description,
    providerRegion: provider.region,
    inboundText: body,
    history: (history ?? []).filter((m) => m.id !== undefined),
    knowledge,
    liveContext,
  });

  // 12b. Parse HITL escalation tag
  const hitlMatch = rawReply.match(NEEDS_HUMAN_RE);
  const reply = rawReply.replace(NEEDS_HUMAN_RE, '').replace(/\s{2,}/g, ' ').trim();
  const needsHuman = !!hitlMatch;
  const hitlReason = hitlMatch?.[1]?.trim() ?? null;

  // 13. Send + persist outbound (with English trail if AI replied in another language)
  const replyEn = detectedLang && detectedLang !== 'en'
    ? await detectAndTranslate(reply).then((r) => r.english).catch(() => null)
    : null;
  await sendAndPersist(supabase, conv.id, config, accessToken, from, reply, true, detectedLang, replyEn);

  // 13b. If AI flagged uncertainty — escalate and notify provider
  if (needsHuman) {
    await supabase.from('wa_conversations').update({ status: 'escalated' }).eq('id', conv.id);
    await supabase.from('wa_escalations').insert({
      conversation_id: conv.id,
      reason: `AI requested human review: ${hitlReason}`,
      trigger_type: 'sentiment',
    });
  }

  // 14. Mark inbound as read
  await markWhatsAppRead({
    phoneNumberId: config.phone_number_id,
    accessToken: accessToken,
    messageId: waMessageId,
  });
}

async function sendAndPersist(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  convId: string,
  config: PosadaWhatsappConfig,
  accessToken: string,
  to: string,
  body: string,
  isAi: boolean,
  detectedLang?: string | null,
  contentEn?: string | null
) {
  const result = await sendWhatsAppText({
    phoneNumberId: config.phone_number_id,
    accessToken,
    to,
    body,
  });

  if (!result.success) {
    console.error('[whatsapp/webhook] sendWhatsAppText failed:', result.error);
    // Still persist so the provider can see the attempted reply in the dashboard.
  }

  const { error: insertError } = await supabase.from('wa_messages').insert({
    conversation_id: convId,
    wa_message_id: result.messageId ?? null,
    role: 'outbound',
    content: body,
    content_en: contentEn ?? null,
    detected_lang: detectedLang ?? null,
    is_ai: isAi,
    flagged: false,
  });
  if (insertError) {
    console.error('[whatsapp/webhook] wa_messages insert failed:', insertError.message);
  }

  await supabase
    .from('wa_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: `→ ${body.slice(0, 100)}`,
    })
    .eq('id', convId);
}
