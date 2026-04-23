/**
 * sendAndPersist — sends an outbound WhatsApp message and persists it to the database.
 *
 * Handles:
 * - Outbound idempotency (content fingerprint + 5-second time window)
 * - 24-hour messaging window enforcement (template fallback)
 * - WhatsApp API send (text or template)
 * - Database persistence with idempotency key
 * - Dual-language translation storage
 * - Conversation preview update
 */

import { sendWhatsAppText, sendWhatsAppTemplate } from '@/lib/whatsapp-api';
import { isWindowOpen } from '@/lib/whatsapp-window';
import type { PosadaWhatsappConfig } from '@/types/database';
import type { ServiceClient } from '@/types/supabase-client';

export async function sendAndPersist(
  supabase: ServiceClient,
  convId: string,
  config: PosadaWhatsappConfig,
  accessToken: string,
  to: string,
  body: string,
  isAi: boolean,
  detectedLang?: string | null,
  contentEn?: string | null,
  contentEs?: string | null
) {
  // Outbound idempotency: content fingerprint + 5-second time window.
  // Uses the indexed idempotency_key column for fast lookup.
  const contentFingerprint = body.slice(0, 50).replace(/\s+/g, '_');
  const timeWindow = Math.floor(Date.now() / 5000);
  const idempotencyKey = `${convId}:${contentFingerprint}:${timeWindow}`;

  // Run idempotency check and window check in parallel (saves one DB round-trip)
  const [{ count: existingCount }, { data: convRow }] = await Promise.all([
    supabase
      .from('wa_messages')
      .select('id', { count: 'exact', head: true })
      .eq('idempotency_key', idempotencyKey),
    supabase
      .from('wa_conversations')
      .select('last_customer_message_at')
      .eq('id', convId)
      .single(),
  ]);

  if (existingCount && existingCount > 0) {
    console.warn(`[webhook] Duplicate outbound detected (key=${idempotencyKey}), skipping`);
    return;
  }

  const windowTimestamp = (convRow as { last_customer_message_at?: string | null } | null)
    ?.last_customer_message_at ?? null;

  let result: { success: boolean; messageId?: string; error?: string };

  if (!isWindowOpen(windowTimestamp)) {
    console.warn(`[whatsapp/webhook] 24h window expired for conv ${convId} — attempting template message`);

    const langCode = detectedLang === 'en' ? 'en' : 'es';
    result = await sendWhatsAppTemplate({
      phoneNumberId: config.phone_number_id,
      accessToken,
      to,
      templateName: 'reengagement_greeting',
      languageCode: langCode,
    });

    if (!result.success) {
      console.error('[whatsapp/webhook] Template fallback also failed:', result.error);
      body = `[WINDOW_EXPIRED] ${body}`;
    }
  } else {
    result = await sendWhatsAppText({
      phoneNumberId: config.phone_number_id,
      accessToken,
      to,
      body,
    });
  }

  if (!result.success) {
    console.error('[whatsapp/webhook] send failed:', result.error);
    // Still persist so the provider can see the attempted reply in the dashboard.
  }

  const { data: inserted, error: insertError } = await supabase.from('wa_messages').insert({
    conversation_id: convId,
    wa_message_id: result.messageId ?? null,
    role: 'outbound',
    content: body,
    content_en: contentEn ?? null,
    detected_lang: detectedLang ?? null,
    is_ai: isAi,
    flagged: false,
    idempotency_key: idempotencyKey,
  }).select('id').single();
  if (insertError) {
    // Unique constraint violation = duplicate caught at insert time (race condition safety net)
    if (insertError.code === '23505') {
      console.warn(`[webhook] Duplicate outbound caught at insert (key=${idempotencyKey})`);
      return;
    }
    console.error('[whatsapp/webhook] wa_messages insert failed:', insertError.message);
  }

  // Set content_es via RPC (bypasses PostgREST column cache)
  if (inserted && contentEs) {
    await supabase.rpc('set_message_content_es', { msg_id: inserted.id, es_text: contentEs });
  }

  await supabase
    .from('wa_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: `→ ${body.slice(0, 100)}`,
    })
    .eq('id', convId);
}
