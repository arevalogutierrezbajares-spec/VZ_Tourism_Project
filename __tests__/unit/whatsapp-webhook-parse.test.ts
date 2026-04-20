/**
 * Unit tests for parseWebhookPayload() — converts raw Meta webhook POSTs
 * into a flat array of InboundMessage objects the pipeline can process.
 */

import { parseWebhookPayload, type InboundMessage } from '@/lib/whatsapp-api';

// ─── Fixtures ────────────────────────────────────────────────────────────────

/** Minimal valid single-message webhook payload (text type). */
function makePayload(
  overrides: {
    object?: string;
    messages?: Record<string, unknown>[];
    contacts?: { profile?: { name?: string }; wa_id?: string }[];
    phoneNumberId?: string;
  } = {}
) {
  const {
    object = 'whatsapp_business_account',
    messages = [
      {
        from: '584141234567',
        id: 'wamid.abc123',
        timestamp: '1713600000',
        type: 'text',
        text: { body: 'Hola, quiero reservar' },
      },
    ],
    contacts = [{ profile: { name: 'Maria Garcia' }, wa_id: '584141234567' }],
    phoneNumberId = '100200300',
  } = overrides;

  return {
    object,
    entry: [
      {
        id: 'ENTRY_1',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '15550001111', phone_number_id: phoneNumberId },
              contacts,
              messages,
            },
            field: 'messages',
          },
        ],
      },
    ],
  };
}

// ─── Valid single text message ───────────────────────────────────────────────

test('valid single text message returns 1 InboundMessage with correct fields', () => {
  const result = parseWebhookPayload(makePayload());

  expect(result).toHaveLength(1);
  const msg: InboundMessage = result[0];
  expect(msg.phoneNumberId).toBe('100200300');
  expect(msg.from).toBe('584141234567');
  expect(msg.guestName).toBe('Maria Garcia');
  expect(msg.waMessageId).toBe('wamid.abc123');
  expect(msg.body).toBe('Hola, quiero reservar');
  expect(msg.timestamp).toBe(1713600000);
});

// ─── Multi-message payload ───────────────────────────────────────────────────

test('multi-message payload returns 2 InboundMessages', () => {
  const payload = makePayload({
    messages: [
      { from: '584141234567', id: 'wamid.msg1', timestamp: '1713600000', type: 'text', text: { body: 'Hola' } },
      { from: '584149999999', id: 'wamid.msg2', timestamp: '1713600005', type: 'text', text: { body: 'Buenos dias' } },
    ],
    contacts: [
      { profile: { name: 'Maria Garcia' }, wa_id: '584141234567' },
      { profile: { name: 'Carlos Perez' }, wa_id: '584149999999' },
    ],
  });

  const result = parseWebhookPayload(payload);
  expect(result).toHaveLength(2);
  expect(result[0].body).toBe('Hola');
  expect(result[1].body).toBe('Buenos dias');
  expect(result[1].guestName).toBe('Carlos Perez');
});

// ─── Missing text.body ──────────────────────────────────────────────────────

test('message with missing text.body returns empty body string', () => {
  const payload = makePayload({
    messages: [
      { from: '584141234567', id: 'wamid.notext', timestamp: '1713600000', type: 'text', text: {} },
    ],
  });

  const result = parseWebhookPayload(payload);
  expect(result).toHaveLength(1);
  expect(result[0].body).toBe('');
});

test('message with no text property returns empty body string', () => {
  const payload = makePayload({
    messages: [
      { from: '584141234567', id: 'wamid.noprop', timestamp: '1713600000', type: 'text' },
    ],
  });

  const result = parseWebhookPayload(payload);
  expect(result).toHaveLength(1);
  expect(result[0].body).toBe('');
});

// ─── Malformed payload ──────────────────────────────────────────────────────

test('malformed payload with missing entry returns empty array', () => {
  const result = parseWebhookPayload({ object: 'whatsapp_business_account' });
  expect(result).toEqual([]);
});

test('completely malformed payload returns empty array', () => {
  const result = parseWebhookPayload('not an object');
  expect(result).toEqual([]);
});

test('null payload returns empty array', () => {
  const result = parseWebhookPayload(null);
  expect(result).toEqual([]);
});

// ─── Wrong object field ─────────────────────────────────────────────────────

test('wrong object field (not whatsapp_business_account) returns empty array', () => {
  const payload = makePayload({ object: 'instagram' });
  const result = parseWebhookPayload(payload);
  expect(result).toEqual([]);
});

test('missing object field returns empty array', () => {
  const payload = makePayload();
  delete (payload as Record<string, unknown>).object;
  const result = parseWebhookPayload(payload);
  expect(result).toEqual([]);
});

// ─── Contact name resolution ────────────────────────────────────────────────

test('guestName is populated from contacts array', () => {
  const result = parseWebhookPayload(makePayload());
  expect(result[0].guestName).toBe('Maria Garcia');
});

test('guestName is null when contacts array is empty', () => {
  const payload = makePayload({ contacts: [] });
  const result = parseWebhookPayload(payload);
  expect(result).toHaveLength(1);
  expect(result[0].guestName).toBeNull();
});

test('guestName is null when contact has no profile name', () => {
  const payload = makePayload({
    contacts: [{ wa_id: '584141234567' }],
  });
  const result = parseWebhookPayload(payload);
  expect(result).toHaveLength(1);
  expect(result[0].guestName).toBeNull();
});

// ─── Non-text message types ─────────────────────────────────────────────────

test('image message type is accepted with messageType field', () => {
  const payload = makePayload({
    messages: [
      { from: '584141234567', id: 'wamid.img', timestamp: '1713600000', type: 'image', image: { id: 'img_1' } },
    ],
  });
  const result = parseWebhookPayload(payload);
  expect(result).toHaveLength(1);
  expect(result[0].messageType).toBe('image');
  expect(result[0].body).toBe('');
});
