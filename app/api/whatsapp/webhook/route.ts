import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { createServiceClient } from '@/lib/supabase/server';
import { parseWebhookPayload, markWhatsAppRead } from '@/lib/whatsapp-api';
import { downloadAndStoreMedia } from '@/lib/whatsapp-media';
import { sendAndPersist } from '@/lib/whatsapp-send';
import { analyzeMessage } from '@/lib/sentiment';
import { generateReply, getBotQuestionResponse } from '@/lib/whatsapp-ai';
import { buildLiveContext } from '@/lib/whatsapp-context';
import { buildHandbackContext } from '@/lib/whatsapp-handback';
import { isWithinWorkingHours } from '@/lib/whatsapp-hours';
import { detectAndTranslate } from '@/lib/whatsapp-translate';
import { getWhatsAppToken } from '@/lib/whatsapp/token';
import { hashToken } from '@/lib/whatsapp/hash';
import { Redis } from '@upstash/redis';
import { notifyOperatorEscalation } from '@/lib/whatsapp-escalation';
import { rateLimit, groqRateLimit } from '@/lib/api/rate-limit';
import { checkTopicGuard } from '@/lib/whatsapp-topic-guard';
import type { PosadaWhatsappConfig, PosadaKnowledge, WaMessage } from '@/types/database';
import type { ServiceClient } from '@/types/supabase-client';

// ─── Reply debounce ─────────────────────────────────────────────────────────
// Wait 60s after the last inbound message before generating an AI reply.
// This lets guests finish typing multiple messages — the AI sees the full context.

const DEBOUNCE_MS = process.env.NODE_ENV === 'development' ? 5_000 : 60_000;

const debounceRedis = process.env.UPSTASH_REDIS_REST_URL
  ? Redis.fromEnv()
  : null;

async function setDebounce(convId: string, timestamp: number): Promise<void> {
  if (!debounceRedis) return;
  await debounceRedis.set(`debounce:${convId}`, timestamp, { ex: 120 });
}

async function isLatestDebounce(convId: string, timestamp: number): Promise<boolean> {
  if (!debounceRedis) return true; // no Redis = reply immediately
  const stored = await debounceRedis.get<number>(`debounce:${convId}`);
  return stored === timestamp;
}

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
  const { phoneNumberId, from, guestName, waMessageId, body: msgBody, messageType, mediaId, mediaMimeType } = msg;
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

  // Mark as read immediately — guest sees blue checks regardless of how we process it
  markWhatsAppRead({
    phoneNumberId: config.phone_number_id,
    accessToken,
    messageId: waMessageId,
  }).catch((err) => console.warn('[webhook] markRead failed:', err));

  // 3b. Non-text message — persist with descriptive label, skip AI
  if (messageType !== 'text') {
    const typeLabels: Record<string, string> = {
      image: '[Photo]', audio: '[Voice note]', video: '[Video]',
      document: '[Document]', sticker: '[Sticker]', location: '[Location]',
      contacts: '[Contact]',
    };
    const label = typeLabels[messageType] ?? `[${messageType}]`;

    const { data: insertedMediaMsg } = await supabase.from('wa_messages').insert({
      conversation_id: conv.id,
      wa_message_id: waMessageId,
      role: 'inbound',
      content: label,
      is_ai: false,
      flagged: false,
    }).select('id').single();

    await supabase.from('wa_conversations').update({
      last_message_at: new Date().toISOString(),
      last_customer_message_at: new Date().toISOString(),
      last_message_preview: label,
      guest_name: guestName ?? undefined,
    }).eq('id', conv.id);

    await supabase.rpc('increment_wa_unread', { conv_id: conv.id });

    const ack = config.tone_language === 'en'
      ? 'Thanks for sharing! I can only read text messages right now. Could you describe what you need in a text message?'
      : '¡Gracias por compartir! Por ahora solo puedo leer mensajes de texto. ¿Podrías describir lo que necesitas en un mensaje escrito?';
    await sendAndPersist(supabase, conv.id, config, accessToken, from, ack, true);

    // Download media in background (fire-and-forget) and update the message row
    if (mediaId && insertedMediaMsg) {
      waitUntil(
        downloadAndStoreMedia({
          mediaId,
          accessToken,
          supabase,
          providerId: provider.id,
          conversationId: conv.id,
          messageId: insertedMediaMsg.id,
          mimeType: mediaMimeType ?? 'application/octet-stream',
        }).then(async (result) => {
          if (result) {
            await supabase.from('wa_messages').update({
              media_url: result.publicUrl,
              media_type: mediaMimeType ?? null,
            }).eq('id', insertedMediaMsg.id);
          }
        }).catch((err) => console.error('[webhook] Media download failed:', err))
      );
    }

    return;
  }

  // 4. Sentiment analysis + language detection + translation (run in parallel)
  const [sentimentRaw, translation] = await Promise.all([
    Promise.resolve(analyzeMessage(body)),
    detectAndTranslate(body).catch(() => null),
  ]);

  // Apply provider's custom sentiment threshold on top of the built-in flagging.
  // Threats always escalate (handled by sentiment.ts), AND the provider's slider is also respected.
  const sentiment = { ...sentimentRaw };
  if (
    !sentiment.flagged &&
    typeof config.sentiment_threshold === 'number' &&
    sentiment.score < config.sentiment_threshold
  ) {
    sentiment.flagged = true;
    sentiment.flag_reason = sentiment.flag_reason ?? 'low_sentiment_score';
  }

  const detectedLang = translation?.detected.language ?? null;
  const contentEn = translation?.english ?? null;
  const contentEs = translation?.spanish ?? null;

  // 5. Persist inbound message (with language + dual translations)
  const { data: insertedMsg } = await supabase.from('wa_messages').insert({
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
  }).select('id').single();

  // Set content_es via RPC (bypasses PostgREST column cache)
  if (insertedMsg && contentEs) {
    await supabase.rpc('set_message_content_es', { msg_id: insertedMsg.id, es_text: contentEs });
  }

  // 6. Update conversation preview + detected language
  await supabase
    .from('wa_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_customer_message_at: new Date().toISOString(),
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
    waitUntil(notifyOperatorEscalation({
      supabase, config, accessToken,
      conversation: { id: conv.id, guest_name: guestName, guest_phone: from },
      reason: `Flagged message: ${sentiment.flag_reason}`,
      triggerType: 'sentiment',
    }));
    return;
  }

  // 8b. Keyword escalation — check inbound message against provider's custom keywords
  const escalationKeywords = config.escalation_keywords;
  if (escalationKeywords && escalationKeywords.length > 0) {
    const normalizedBody = body.toLowerCase();
    const matchedKeyword = escalationKeywords.find((kw) =>
      normalizedBody.includes(kw.toLowerCase())
    );
    if (matchedKeyword) {
      await supabase.from('wa_conversations').update({ status: 'escalated' }).eq('id', conv.id);
      await supabase.from('wa_escalations').insert({
        conversation_id: conv.id,
        reason: `Keyword match: "${matchedKeyword}"`,
        trigger_type: 'keyword',
      });
      waitUntil(notifyOperatorEscalation({
        supabase, config, accessToken,
        conversation: { id: conv.id, guest_name: guestName, guest_phone: from },
        reason: `Keyword match: "${matchedKeyword}"`,
        triggerType: 'keyword',
      }));
      return;
    }
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
    waitUntil(notifyOperatorEscalation({
      supabase, config, accessToken,
      conversation: { id: conv.id, guest_name: guestName, guest_phone: from },
      reason: 'Guest asked if speaking to a bot',
      triggerType: 'bot_question',
    }));
    return;
  }

  // 11. Debounce: wait 60s for the guest to finish typing before replying.
  //     Each new message resets the timer. After 60s of silence, generate one
  //     AI reply that accounts for ALL messages sent during the window.
  const debounceTs = Date.now();
  await setDebounce(conv.id, debounceTs);

  // Schedule the delayed reply via waitUntil (keeps serverless function alive)
  waitUntil(
    scheduleDelayedReply({
      debounceTs,
      convId: conv.id,
      config,
      provider,
      accessToken,
      guestPhone: from,
      detectedLang,
    })
  );
}

// ─── Debounced AI reply ─────────────────────────────────────────────────────

interface DelayedReplyOpts {
  debounceTs: number;
  convId: string;
  config: PosadaWhatsappConfig;
  provider: { id: string; business_name: string; description: string; region: string };
  accessToken: string;
  guestPhone: string;
  detectedLang: string | null;
}

async function scheduleDelayedReply(opts: DelayedReplyOpts) {
  // Wait for the guest to stop typing
  await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS));

  // Check if a newer message reset the debounce
  if (!(await isLatestDebounce(opts.convId, opts.debounceTs))) {
    return; // a newer message will handle the reply
  }

  const supabase = await createServiceClient();
  if (!supabase) return;

  // Re-check conversation status (may have been escalated or closed during the wait)
  const { data: conv } = await supabase
    .from('wa_conversations')
    .select('id, status')
    .eq('id', opts.convId)
    .single();

  if (!conv || conv.status === 'human' || conv.status === 'closed' || conv.status === 'escalated') return;

  // Build handback context if conversation was recently in human mode
  const handbackContext = await buildHandbackContext(supabase, opts.convId).catch(() => null);

  // Per-provider Groq rate limit
  if (await groqRateLimit(opts.config.provider_id)) {
    console.warn(`[webhook] Groq rate limited for provider: ${opts.config.provider_id}`);
    const fallback = opts.config.after_hours_message || 'Estamos recibiendo muchos mensajes. Te responderemos pronto.';
    await sendAndPersist(supabase, opts.convId, opts.config, opts.accessToken, opts.guestPhone, fallback, true);
    return;
  }

  // Load full history + knowledge (gets ALL messages including ones sent during the wait)
  const [{ data: history }, { data: knowledge }] = await Promise.all([
    supabase
      .from('wa_messages')
      .select('id, role, content, is_ai, created_at')
      .eq('conversation_id', opts.convId)
      .order('created_at', { ascending: true })
      .limit(20) as unknown as Promise<{ data: WaMessage[] | null }>,
    supabase
      .from('posada_knowledge')
      .select('*')
      .eq('provider_id', opts.provider.id)
      .single() as unknown as Promise<{ data: PosadaKnowledge | null }>,
  ]);

  const liveContext = await buildLiveContext(supabase, opts.provider.id, knowledge).catch(() => undefined);

  // Get the latest inbound message text for the AI (it sees full history anyway)
  const lastInbound = (history ?? []).filter((m) => m.role === 'inbound').pop();
  const inboundText = lastInbound?.content ?? '';

  // Use language already detected in handleMessage (avoids duplicate Groq call)
  const detectedLang = opts.detectedLang;

  // Topic guard: block off-topic, adversarial, and harmful messages before AI
  const guard = checkTopicGuard(inboundText, opts.provider.business_name, detectedLang);
  if (guard.blocked) {
    console.info(`[webhook] Topic guard blocked [${guard.category}]: ${inboundText.slice(0, 80)}`);
    await sendAndPersist(supabase, opts.convId, opts.config, opts.accessToken, opts.guestPhone, guard.deflection!, true, detectedLang);
    return;
  }

  // Generate AI reply
  let rawReply: string;
  try {
    rawReply = await generateReply({
      config: opts.config,
      providerName: opts.provider.business_name,
      providerDescription: opts.provider.description,
      providerRegion: opts.provider.region,
      inboundText,
      history: (history ?? []).filter((m) => m.id !== undefined),
      knowledge,
      liveContext,
      detectedLang,
      handbackContext,
    });
  } catch (groqErr) {
    console.error('[whatsapp/webhook] Groq error — sending fallback message:', groqErr);
    const fallbackMessages: Record<string, string> = {
      es: 'Estamos experimentando una breve demora. Un miembro del equipo responderá en breve.',
      en: 'We\'re experiencing a brief delay. A team member will respond shortly.',
      it: 'Stiamo riscontrando un breve ritardo. Un membro del team risponderà a breve.',
      pt: 'Estamos com um breve atraso. Um membro da equipe responderá em breve.',
      fr: 'Nous rencontrons un bref délai. Un membre de l\'équipe vous répondra sous peu.',
    };
    const fallbackMsg = fallbackMessages[detectedLang ?? ''] ?? fallbackMessages.es;
    await sendAndPersist(supabase, opts.convId, opts.config, opts.accessToken, opts.guestPhone, fallbackMsg, true);
    await supabase.from('wa_conversations').update({ status: 'escalated' }).eq('id', opts.convId);
    await supabase.from('wa_escalations').insert({
      conversation_id: opts.convId,
      reason: 'AI (Groq) timeout or error — fallback message sent',
      trigger_type: 'ai_error',
    });
    notifyOperatorEscalation({
      supabase, config: opts.config, accessToken: opts.accessToken,
      conversation: { id: opts.convId, guest_name: null, guest_phone: opts.guestPhone },
      reason: 'AI error — fallback message sent',
      triggerType: 'ai_error',
    });
    return;
  }

  // Parse HITL escalation tag
  const hitlMatch = rawReply.match(NEEDS_HUMAN_RE);
  const reply = rawReply.replace(NEEDS_HUMAN_RE, '').replace(/\s{2,}/g, ' ').trim();
  const needsHuman = !!hitlMatch;
  const hitlReason = hitlMatch?.[1]?.trim() ?? null;

  // Dual-translate the outbound reply so admins can read it
  const replyTranslation = await detectAndTranslate(reply).catch(() => null);
  const replyEn = replyTranslation?.english ?? null;
  const replyEs = replyTranslation?.spanish ?? null;
  await sendAndPersist(supabase, opts.convId, opts.config, opts.accessToken, opts.guestPhone, reply, true, detectedLang, replyEn, replyEs);

  if (needsHuman) {
    await supabase.from('wa_conversations').update({ status: 'escalated' }).eq('id', opts.convId);
    await supabase.from('wa_escalations').insert({
      conversation_id: opts.convId,
      reason: `AI requested human review: ${hitlReason}`,
      trigger_type: 'hitl',
    });
    notifyOperatorEscalation({
      supabase, config: opts.config, accessToken: opts.accessToken,
      conversation: { id: opts.convId, guest_name: null, guest_phone: opts.guestPhone },
      reason: `AI requested human review: ${hitlReason}`,
      triggerType: 'hitl',
    });
  }
}

