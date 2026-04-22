// WhatsApp Cloud API client
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/

const WA_API_VERSION = 'v21.0';
const WA_BASE = `https://graph.facebook.com/${WA_API_VERSION}`;

interface SendTextOptions {
  phoneNumberId: string;
  accessToken: string;
  to: string;       // recipient phone in E.164 format e.g. "584141234567"
  body: string;
}

interface MarkReadOptions {
  phoneNumberId: string;
  accessToken: string;
  messageId: string;
}

async function waPost(
  path: string,
  accessToken: string,
  body: Record<string, unknown>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout
  let res: Response;
  try {
    res = await fetch(`${WA_BASE}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken.trim().replace(/\s+/g, '')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    return { success: false, error: `fetch error: ${String(err)}` };
  }
  clearTimeout(timeout);

  if (!res.ok) {
    const text = await res.text();
    console.error(`[WhatsApp API] ${res.status}: ${text}`);
    return { success: false, error: 'WhatsApp API request failed' };
  }

  const data = await res.json() as { messages?: { id: string }[] };
  return { success: true, messageId: data.messages?.[0]?.id };
}

export async function sendWhatsAppText(opts: SendTextOptions) {
  return waPost(
    `/${opts.phoneNumberId}/messages`,
    opts.accessToken,
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: opts.to,
      type: 'text',
      text: { preview_url: false, body: opts.body },
    }
  );
}

export async function markWhatsAppRead(opts: MarkReadOptions) {
  return waPost(
    `/${opts.phoneNumberId}/messages`,
    opts.accessToken,
    {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: opts.messageId,
    }
  );
}

// Parses the incoming Meta webhook payload and returns a flat list of messages
export interface InboundMessage {
  phoneNumberId: string;
  from: string;             // sender phone E.164
  guestName: string | null;
  waMessageId: string;
  body: string;
  messageType: string;
  timestamp: number;
}

export function parseWebhookPayload(payload: unknown): InboundMessage[] {
  const messages: InboundMessage[] = [];

  try {
    const p = payload as {
      object?: string;
      entry?: {
        changes?: {
          value?: {
            metadata?: { phone_number_id?: string };
            contacts?: { profile?: { name?: string }; wa_id?: string }[];
            messages?: { from?: string; id?: string; timestamp?: string; type?: string; text?: { body?: string } }[];
          };
        }[];
      }[];
    };

    if (p.object !== 'whatsapp_business_account') return messages;

    for (const entry of p.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const val = change.value;
        if (!val?.messages?.length) continue;

        const phoneNumberId = val.metadata?.phone_number_id ?? '';
        const contactMap = new Map(
          (val.contacts ?? []).map((c) => [c.wa_id, c.profile?.name ?? null])
        );

        for (const msg of val.messages) {
          if (!msg.id) continue;
          const body = msg.text?.body ?? '';
          messages.push({
            phoneNumberId,
            from: msg.from ?? '',
            guestName: contactMap.get(msg.from ?? '') ?? null,
            waMessageId: msg.id,
            body,
            messageType: msg.type ?? 'unknown',
            timestamp: parseInt(msg.timestamp ?? '0', 10),
          });
        }
      }
    }
  } catch {
    // malformed payload — return empty
  }

  return messages;
}
