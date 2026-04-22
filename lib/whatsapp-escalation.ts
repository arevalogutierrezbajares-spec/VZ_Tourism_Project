import { sendWhatsAppText } from '@/lib/whatsapp-api';
import type { ServiceClient } from '@/types/supabase-client';
import type { PosadaWhatsappConfig, WaMessage } from '@/types/database';

interface EscalationNotifyOpts {
  supabase: ServiceClient;
  config: PosadaWhatsappConfig & { operator_phone?: string | null; notify_escalations?: boolean };
  accessToken: string;
  conversation: { id: string; guest_name: string | null; guest_phone: string };
  reason: string;
  triggerType: string;
}

/**
 * Sends a WhatsApp notification to the operator when a conversation is escalated.
 * Fire-and-forget: logs errors but never throws.
 */
export async function notifyOperatorEscalation(opts: EscalationNotifyOpts): Promise<void> {
  try {
    const { config, accessToken, conversation, reason, triggerType, supabase } = opts;

    // 1. Check if operator notifications are enabled
    if (!config.operator_phone || !config.notify_escalations) {
      return;
    }

    // 2. Fetch last 3 messages from the conversation for context
    const { data: messages } = await supabase
      .from('wa_messages')
      .select('role, content, is_ai')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(3);

    // 3. Build context snippet from recent messages (oldest first)
    const recentMessages = (messages as Pick<WaMessage, 'role' | 'content' | 'is_ai'>[] | null) ?? [];
    const contextLines = recentMessages
      .reverse()
      .map((m) => {
        const prefix = m.role === 'inbound' ? '\u{1F464}' : '\u{1F916}';
        // Truncate individual messages to keep the notification concise
        const text = m.content.length > 200 ? m.content.slice(0, 197) + '...' : m.content;
        return `${prefix} ${text}`;
      })
      .join('\n');

    // 4. Build the notification message
    const guestLabel = conversation.guest_name || conversation.guest_phone;
    const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://vamosavenezuela.com'}/dashboard/whatsapp`;

    const body = [
      `\u26A0\uFE0F Escalaci\u00F3n \u2014 ${guestLabel}`,
      `Raz\u00F3n: ${reason}`,
      `Tipo: ${triggerType}`,
      '',
      '\u00DAltimos mensajes:',
      contextLines || '(sin mensajes)',
      '',
      `Dashboard: ${dashboardUrl}`,
    ].join('\n');

    // 5. Send via WhatsApp to operator
    const result = await sendWhatsAppText({
      phoneNumberId: config.phone_number_id,
      accessToken,
      to: config.operator_phone,
      body,
    });

    if (result.success) {
      console.log(
        `[Escalation] Notified operator ${config.operator_phone} for conversation ${conversation.id}`
      );
    } else {
      console.error(
        `[Escalation] Failed to notify operator: ${result.error}`,
        { conversationId: conversation.id }
      );
    }
  } catch (err) {
    // Fire-and-forget: never propagate errors
    console.error('[Escalation] Unexpected error in notifyOperatorEscalation:', err);
  }
}
