import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { createServiceClient } from '@/lib/supabase/server';
import { parseWebhookPayload, sendWhatsAppText, markWhatsAppRead } from '@/lib/whatsapp-api';
import { analyzeMessage } from '@/lib/sentiment';
import { generateReply, getBotQuestionResponse } from '@/lib/whatsapp-ai';
import { buildLiveContext } from '@/lib/whatsapp-context';
import { isWithinWorkingHours } from '@/lib/whatsapp-hours';
import { detectAndTranslate } from '@/lib/whatsapp-translate';
import { getWhatsAppToken } from '@/lib/whatsapp/token';
import { hashToken } from '@/lib/whatsapp/hash';
import { rateLimit, groqRateLimit } from '@/lib/api/rate-limit';
import type { PosadaWhatsappConfig, PosadaKnowledge, WaMessage } from '@/types/database';
import type { ServiceClient } from '@/types/supabase-client';

// Regex to extract [NEEDS_HUMAN: <reason>] tag from AI replies.
// Permissive — matches anywhere in the string so the LLM can place it mid-reply.
const NEEDS_HUMAN_RE = /\[NEEDS_HUMAN:\s*([^\]]+)\]/;

// ─── Webhook signature verification ──────────────────────────────────────────

function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret) {
    console.error('[whatsapp/webhook] META_APP_SECRET is not set — all inbound messages will be rejected');
    return false;
  }
  if (!signature) return false;
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ─── Webhook verification (Meta GET challenge) ────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode      = searchParams.get('hub.mode');
  const token     = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode !== 'subscribe' || !challenge || !token) {
    return new NextResponse('Bad Request', { status: 400 });
  }

  // Look up the config row where verify_token matches (hashed first, plaintext fallback)
  const supabase = await createServiceClient();
  if (!supabase) return new NextResponse('Service unavailable', { status: 503 });

  // Try hashed comparison first
  const { data: config } = await supabase
    .from('posada_whatsapp_config')
    .select('id')
    .eq('verify_token', hashToken(token))
    .single();

  if (!config) {
    // Fallback: try plaintext match for pre-migration tokens
    const { data: legacyConfig } = await supabase
      .from('posada_whatsapp_config')
      .select('id')
      .eq('verify_token', token)
      .single();

    if (!legacyConfig) return new NextResponse('Forbidden', { status: 403 });

    // Auto-migrate: hash the plaintext token so future lookups use the hashed path
    await supabase
      .from('posada_whatsapp_config')
      .update({ verify_token: hashToken(token) })
      .eq('id', legacyConfig.id);
    console.info('[whatsapp/webhook] verify_token auto-migrated from plaintext to hash');
  }

  return new NextResponse(challenge, { status: 200 });
}

// ─── Inbound message handler ──────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Read raw body and verify Meta webhook signature (HMAC-SHA256)
  const rawBody = await request.text();
  const sig = request.headers.get('x-hub-signature-256');
  if (!verifyWebhookSignature(rawBody, sig)) {
    return new NextResponse('Invalid signature', { status: 403 });
  }

  // 2. Parse JSON from verified raw body
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
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
    // Rate limit: skip processing if phone number exceeds threshold
    const rateLimitRes = await rateLimit(`wh:${msg.from}`, 20);
    if (rateLimitRes) {
      console.warn(`[webhook] Rate limited phone: ${msg.from}`);
      continue;
    }
    try {
      await handleMessage(supabase, msg);
    } catch (err) {
      console.error('[whatsapp/webhook] handleMessage error:', err, msg);
    }
  }
}

async function handleMessage(
  supabase: ServiceClient,
  msg: Awaited<ReturnType<typeof parseWebhookPayload>>[number]
) {
  const { phoneNumberId, from, guestName, waMessageId, body: msgBody, messageType } = msg;
  // Cap message body to prevent abuse (WhatsApp max is 4096)
  const body = msgBody.slice(0, 4096);

  // Validate required fields
  if (!phoneNumberId || !from || !waMessageId) {
    console.warn('[webhook] Malformed message — missing required fields:', {
      phoneNumberId: !!phoneNumberId,
      from: !!from,
      waMessageId: !!waMessageId,
    });
    return;
  }

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

  // 3b. Non-text message — persist with descriptive label, skip AI
  if (messageType !== 'text') {
    const typeLabels: Record<string, string> = {
      image: '[Photo]', audio: '[Voice note]', video: '[Video]',
      document: '[Document]', sticker: '[Sticker]', location: '[Location]',
      contacts: '[Contact]',
    };
    const label = typeLabels[messageType] ?? `[${messageType}]`;

    await supabase.from('wa_messages').insert({
      conversation_id: conv.id,
      wa_message_id: waMessageId,
      role: 'inbound',
      content: label,
      is_ai: false,
      flagged: false,
    });

    await supabase.from('wa_conversations').update({
      last_message_at: new Date().toISOString(),
      last_message_preview: label,
      guest_name: guestName ?? undefined,
    }).eq('id', conv.id);

    await supabase.rpc('increment_wa_unread', { conv_id: conv.id });

    const ack = config.tone_language === 'en'
      ? 'Thanks for sharing! I can only read text messages right now. Could you describe what you need in a text message?'
      : '¡Gracias por compartir! Por ahora solo puedo leer mensajes de texto. ¿Podrías describir lo que necesitas en un mensaje escrito?';
    await sendAndPersist(supabase, conv.id, config, accessToken, from, ack, true);
    return;
  }

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

  // 6. Update conversation preview + detected language
  await supabase
    .from('wa_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: body.slice(0, 120),
      guest_name: guestName ?? undefined,
      guest_language: detectedLang ?? undefined,
    })
    .eq('id', conv.id);

  // Increment unread count atomically via RPC
  await supabase.rpc('increment_wa_unread', { conv_id: conv.id });


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

  // 9b. Working hours check
  if (config.working_hours_enabled && !isWithinWorkingHours(config)) {
    if (config.after_hours_message) {
      await sendAndPersist(supabase, conv.id, config, accessToken, from, config.after_hours_message, true);
    }
    return;
  }

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
      .limit(20) as unknown as Promise<{ data: WaMessage[] | null }>,
    supabase
      .from('posada_knowledge')
      .select('*')
      .eq('provider_id', provider.id)
      .single() as unknown as Promise<{ data: PosadaKnowledge | null }>,
  ]);

  // 11c. Build live context (dynamic pricing + availability)
  const liveContext = await buildLiveContext(supabase, provider.id, knowledge).catch(() => undefined);

  // 11d. Per-provider Groq rate limit
  if (await groqRateLimit(config.provider_id)) {
    console.warn(`[webhook] Groq rate limited for provider: ${config.provider_id}`);
    const fallback = config.after_hours_message || 'Estamos recibiendo muchos mensajes. Te responderemos pronto.';
    await sendAndPersist(supabase, conv.id, config, accessToken, from, fallback, true);
    return;
  }

  // 12. Generate AI reply via Groq
  let rawReply: string;
  try {
    rawReply = await generateReply({
      config,
      providerName: provider.business_name,
      providerDescription: provider.description,
      providerRegion: provider.region,
      inboundText: body,
      history: (history ?? []).filter((m) => m.id !== undefined),
      knowledge,
      liveContext,
    });
  } catch (groqErr) {
    console.error('[whatsapp/webhook] Groq error — sending fallback message:', groqErr);
    const fallbackMsg = config.tone_language === 'es'
      ? 'Estamos experimentando una breve demora. Un miembro del equipo responderá en breve.'
      : 'We\'re experiencing a brief delay. A team member will respond shortly.';
    await sendAndPersist(supabase, conv.id, config, accessToken, from, fallbackMsg, true);
    // Escalate so a human follows up
    await supabase.from('wa_conversations').update({ status: 'escalated' }).eq('id', conv.id);
    await supabase.from('wa_escalations').insert({
      conversation_id: conv.id,
      reason: 'AI (Groq) timeout or error — fallback message sent',
      trigger_type: 'sentiment',
    });
    return;
  }

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
  supabase: ServiceClient,
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
