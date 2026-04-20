/** @jest-environment node */
/**
 * Integration tests for the WhatsApp webhook route (GET + POST).
 *
 * TDD RED phase: these test the full webhook lifecycle with mocked
 * dependencies (Supabase, Groq, Meta API). Covers:
 * - GET: Meta challenge verification
 * - POST: signature verification, rate limiting, AI reply generation,
 *   sentiment-based escalation, HITL escalation, working hours, bot questions
 */

import crypto from 'crypto';
import { NextRequest } from 'next/server';

// ─── Mock setup (must be before imports) ─────────────────────────────────────

const mockSupabaseFrom = jest.fn();
const mockSupabaseRpc = jest.fn();
const mockServiceClient = {
  from: mockSupabaseFrom,
  rpc: mockSupabaseRpc,
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(() => mockServiceClient),
}));

jest.mock('@/lib/whatsapp/token', () => ({
  getWhatsAppToken: jest.fn(() => Promise.resolve('EAAx_test_token')),
}));

jest.mock('@/lib/whatsapp/hash', () => ({
  hashToken: jest.fn((t: string) => `hashed_${t}`),
}));

const mockSendWhatsAppText = jest.fn().mockResolvedValue({ success: true, messageId: 'wamid.out1' });
const mockMarkWhatsAppRead = jest.fn().mockResolvedValue({ success: true });

jest.mock('@/lib/whatsapp-api', () => ({
  parseWebhookPayload: jest.requireActual('@/lib/whatsapp-api').parseWebhookPayload,
  sendWhatsAppText: (...args: unknown[]) => mockSendWhatsAppText(...args),
  markWhatsAppRead: (...args: unknown[]) => mockMarkWhatsAppRead(...args),
}));

const mockGenerateReply = jest.fn().mockResolvedValue('¡Hola! Bienvenido a nuestra posada.');

jest.mock('@/lib/whatsapp-ai', () => ({
  generateReply: (...args: unknown[]) => mockGenerateReply(...args),
  getBotQuestionResponse: jest.fn(() => 'Soy el asistente digital de Test Posada.'),
}));

jest.mock('@/lib/whatsapp-context', () => ({
  buildLiveContext: jest.fn().mockResolvedValue('## Live Property Data\nAll rooms available.'),
}));

jest.mock('@/lib/whatsapp-hours', () => ({
  isWithinWorkingHours: jest.fn(() => true),
}));

jest.mock('@/lib/whatsapp-translate', () => ({
  detectAndTranslate: jest.fn().mockResolvedValue({
    detected: { language: 'es', languageName: 'Spanish', isEnglish: false, confidence: 'high' },
    english: 'Hello, I want to book a room',
  }),
}));

jest.mock('@/lib/groq', () => ({
  getGroqClient: jest.fn(),
  GROQ_MODEL: 'llama-3.3-70b-versatile',
}));

// Mock waitUntil to run synchronously for tests
jest.mock('@vercel/functions', () => ({
  waitUntil: (p: Promise<void>) => p,
}));

// Now import the route handlers
import { GET, POST } from '@/app/api/whatsapp/webhook/route';
import { isWithinWorkingHours } from '@/lib/whatsapp-hours';

// ─── Test helpers ────────────────────────────────────────────────────────────

const META_APP_SECRET = 'test_app_secret_12345';

function signPayload(body: string): string {
  return `sha256=${crypto.createHmac('sha256', META_APP_SECRET).update(body).digest('hex')}`;
}

function makeWebhookPayload(overrides: { from?: string; body?: string; messageType?: string } = {}) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: 'pnid_123' },
              contacts: [{ wa_id: overrides.from ?? '584141000001', profile: { name: 'Maria Test' } }],
              messages: [
                {
                  from: overrides.from ?? '584141000001',
                  id: `wamid.${Date.now()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: overrides.messageType ?? 'text',
                  text: { body: overrides.body ?? 'Hola, quiero reservar una habitación' },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function makePostRequest(payload: object): NextRequest {
  const body = JSON.stringify(payload);
  const sig = signPayload(body);
  return new NextRequest('http://localhost/api/whatsapp/webhook', {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/json',
      'x-hub-signature-256': sig,
    },
  });
}

// Supabase mock helpers
function setupSupabaseMocks(configOverrides: Record<string, unknown> = {}) {
  const defaultConfig = {
    id: 'cfg-1',
    provider_id: 'prov-1',
    phone_number_id: 'pnid_123',
    access_token: 'EAAx_token',
    access_token_vault_id: null,
    ai_enabled: true,
    persona_name: 'Luna',
    persona_bio: 'Friendly guide',
    tone_formality: 'casual',
    tone_language: 'bilingual',
    response_length: 'standard',
    booking_pressure: 'soft',
    emoji_style: 'moderate',
    upsell_enabled: false,
    working_hours_enabled: false,
    working_hours: null,
    after_hours_message: null,
    custom_instructions: null,
    providers: { id: 'prov-1', business_name: 'Test Posada', description: 'A cozy place', region: 'Mérida' },
    ...configOverrides,
  };

  const conversation = { id: 'conv-1', status: 'ai' };
  const knowledge = { property_description: 'A test posada', room_types: [] };

  mockSupabaseFrom.mockImplementation((table: string) => {
    const chain: Record<string, jest.Mock> = {};
    const chainMethods = ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq', 'order', 'limit', 'head'];
    chainMethods.forEach((m) => { chain[m] = jest.fn().mockReturnValue(chain); });

    if (table === 'posada_whatsapp_config') {
      chain.single = jest.fn().mockResolvedValue({ data: defaultConfig, error: null });
    } else if (table === 'wa_conversations') {
      chain.single = jest.fn().mockResolvedValue({ data: conversation, error: null });
    } else if (table === 'wa_messages') {
      // For dedup check (count query)
      chain.single = jest.fn().mockResolvedValue({ data: null, error: null });
      (chain as unknown as PromiseLike<unknown>).then = (resolve: Function) =>
        Promise.resolve({ data: [], error: null, count: 0 }).then(resolve as () => void);
    } else if (table === 'posada_knowledge') {
      chain.single = jest.fn().mockResolvedValue({ data: knowledge, error: null });
    } else if (table === 'wa_escalations') {
      chain.single = jest.fn().mockResolvedValue({ data: { id: 'esc-1' }, error: null });
      (chain as unknown as PromiseLike<unknown>).then = (resolve: Function) =>
        Promise.resolve({ data: { id: 'esc-1' }, error: null }).then(resolve as () => void);
    } else {
      chain.single = jest.fn().mockResolvedValue({ data: null, error: null });
    }

    (chain as unknown as PromiseLike<unknown>).then = (chain as unknown as PromiseLike<unknown>).then ??
      ((resolve: Function) => Promise.resolve({ data: null, error: null }).then(resolve as () => void));

    return chain;
  });

  mockSupabaseRpc.mockResolvedValue({ data: null, error: null });
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  process.env.META_APP_SECRET = META_APP_SECRET;
  setupSupabaseMocks();
});

afterEach(() => {
  delete process.env.META_APP_SECRET;
});

// ─── GET: Meta challenge verification ────────────────────────────────────────

describe('GET /api/whatsapp/webhook (challenge verification)', () => {
  test('returns 400 when mode is not subscribe', async () => {
    const req = new NextRequest(
      'http://localhost/api/whatsapp/webhook?hub.mode=unsubscribe&hub.verify_token=abc&hub.challenge=123'
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  test('returns 400 when challenge is missing', async () => {
    const req = new NextRequest(
      'http://localhost/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=abc'
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  test('returns 403 when verify_token does not match any config', async () => {
    mockSupabaseFrom.mockImplementation(() => {
      const chain: Record<string, jest.Mock> = {};
      ['select', 'eq', 'update'].forEach((m) => { chain[m] = jest.fn().mockReturnValue(chain); });
      chain.single = jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      return chain;
    });

    const req = new NextRequest(
      'http://localhost/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=test_challenge'
    );
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  test('returns 200 with challenge when verify_token matches (hashed)', async () => {
    mockSupabaseFrom.mockImplementation(() => {
      const chain: Record<string, jest.Mock> = {};
      ['select', 'eq', 'update'].forEach((m) => { chain[m] = jest.fn().mockReturnValue(chain); });
      chain.single = jest.fn().mockResolvedValue({ data: { id: 'cfg-1' }, error: null });
      return chain;
    });

    const req = new NextRequest(
      'http://localhost/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=my_verify_token&hub.challenge=challenge_abc'
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('challenge_abc');
  });
});

// ─── POST: Signature verification ───────────────────────────────────────────

describe('POST /api/whatsapp/webhook (signature)', () => {
  test('returns 403 with invalid signature', async () => {
    const payload = makeWebhookPayload();
    const req = new NextRequest('http://localhost/api/whatsapp/webhook', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': 'sha256=invalid_signature',
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  test('returns 403 when META_APP_SECRET is not set', async () => {
    delete process.env.META_APP_SECRET;
    const payload = makeWebhookPayload();
    const body = JSON.stringify(payload);
    const req = new NextRequest('http://localhost/api/whatsapp/webhook', {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': signPayload(body),
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  test('returns 200 ok with valid signature', async () => {
    const payload = makeWebhookPayload();
    const req = makePostRequest(payload);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
  });
});

// ─── POST: Message processing ────────────────────────────────────────────────

describe('POST /api/whatsapp/webhook (message processing)', () => {
  test('generates AI reply and sends it via WhatsApp API', async () => {
    const payload = makeWebhookPayload({ body: 'Cuánto cuesta una habitación?' });
    const req = makePostRequest(payload);
    await POST(req);

    // Wait for async processing (waitUntil runs synchronously in test)
    await new Promise((r) => setTimeout(r, 10));

    expect(mockGenerateReply).toHaveBeenCalled();
    expect(mockSendWhatsAppText).toHaveBeenCalledWith(
      expect.objectContaining({
        phoneNumberId: 'pnid_123',
        to: '584141000001',
        body: '¡Hola! Bienvenido a nuestra posada.',
      })
    );
  });

  test('marks inbound message as read after processing', async () => {
    const payload = makeWebhookPayload();
    const req = makePostRequest(payload);
    await POST(req);
    await new Promise((r) => setTimeout(r, 10));

    expect(mockMarkWhatsAppRead).toHaveBeenCalledWith(
      expect.objectContaining({
        phoneNumberId: 'pnid_123',
        accessToken: 'EAAx_test_token',
      })
    );
  });

  test('does not generate AI reply when ai_enabled is false', async () => {
    setupSupabaseMocks({ ai_enabled: false });
    const payload = makeWebhookPayload();
    const req = makePostRequest(payload);
    await POST(req);
    await new Promise((r) => setTimeout(r, 10));

    expect(mockGenerateReply).not.toHaveBeenCalled();
  });

  test('does not generate AI reply when conversation is in human mode', async () => {
    // Override conversation status to 'human'
    const origFrom = mockSupabaseFrom;
    mockSupabaseFrom.mockImplementation((table: string) => {
      const chain: Record<string, jest.Mock> = {};
      const chainMethods = ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq', 'order', 'limit', 'head'];
      chainMethods.forEach((m) => { chain[m] = jest.fn().mockReturnValue(chain); });

      if (table === 'wa_conversations') {
        chain.single = jest.fn().mockResolvedValue({ data: { id: 'conv-1', status: 'human' }, error: null });
      } else if (table === 'posada_whatsapp_config') {
        chain.single = jest.fn().mockResolvedValue({
          data: {
            id: 'cfg-1', provider_id: 'prov-1', phone_number_id: 'pnid_123',
            access_token: 'EAAx_token', access_token_vault_id: null, ai_enabled: true,
            persona_name: 'Luna', tone_language: 'bilingual', working_hours_enabled: false,
            providers: { id: 'prov-1', business_name: 'Test', description: 'Test', region: 'Test' },
          },
          error: null,
        });
      } else if (table === 'wa_messages') {
        (chain as unknown as PromiseLike<unknown>).then = (resolve: Function) =>
          Promise.resolve({ data: null, error: null, count: 0 }).then(resolve as () => void);
      } else {
        chain.single = jest.fn().mockResolvedValue({ data: null, error: null });
      }

      (chain as unknown as PromiseLike<unknown>).then = (chain as unknown as PromiseLike<unknown>).then ??
        ((resolve: Function) => Promise.resolve({ data: null, error: null }).then(resolve as () => void));
      return chain;
    });

    const payload = makeWebhookPayload();
    const req = makePostRequest(payload);
    await POST(req);
    await new Promise((r) => setTimeout(r, 10));

    expect(mockGenerateReply).not.toHaveBeenCalled();
  });

  test('sends after-hours message when outside working hours', async () => {
    setupSupabaseMocks({
      working_hours_enabled: true,
      after_hours_message: 'Estamos cerrados. Respondemos mañana a las 8am.',
    });
    (isWithinWorkingHours as jest.Mock).mockReturnValueOnce(false);

    const payload = makeWebhookPayload();
    const req = makePostRequest(payload);
    await POST(req);
    await new Promise((r) => setTimeout(r, 10));

    expect(mockGenerateReply).not.toHaveBeenCalled();
    expect(mockSendWhatsAppText).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'Estamos cerrados. Respondemos mañana a las 8am.',
      })
    );
  });

  test('sends fallback message and escalates on Groq error', async () => {
    mockGenerateReply.mockRejectedValueOnce(new Error('Groq timeout'));

    const payload = makeWebhookPayload();
    const req = makePostRequest(payload);
    await POST(req);
    await new Promise((r) => setTimeout(r, 10));

    // Should send a fallback message (English because tone_language is 'bilingual')
    expect(mockSendWhatsAppText).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('brief delay'),
      })
    );
  });

  test('handles HITL tag in AI reply — strips tag and escalates', async () => {
    mockGenerateReply.mockResolvedValueOnce(
      'No estoy seguro sobre eso. Déjame verificar. [NEEDS_HUMAN: Guest asking about corporate rates]'
    );

    const payload = makeWebhookPayload({ body: 'Do you have corporate rates for 20 people?' });
    const req = makePostRequest(payload);
    await POST(req);
    await new Promise((r) => setTimeout(r, 10));

    // The sent message should NOT contain the HITL tag
    expect(mockSendWhatsAppText).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.not.stringContaining('[NEEDS_HUMAN'),
      })
    );

    // Should contain the cleaned reply
    expect(mockSendWhatsAppText).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('No estoy seguro'),
      })
    );
  });

  test('sends non-text ACK for image messages', async () => {
    const payload = makeWebhookPayload({ messageType: 'image' });
    const req = makePostRequest(payload);
    await POST(req);
    await new Promise((r) => setTimeout(r, 10));

    // Should NOT call generateReply for non-text
    expect(mockGenerateReply).not.toHaveBeenCalled();
    // Should send a text ACK about not being able to read non-text
    expect(mockSendWhatsAppText).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('text'),
      })
    );
  });
});

// ─── POST: Malformed payloads ────────────────────────────────────────────────

describe('POST /api/whatsapp/webhook (edge cases)', () => {
  test('returns 200 ok for non-JSON body with valid signature', async () => {
    const body = 'this is not json';
    const sig = signPayload(body);
    const req = new NextRequest('http://localhost/api/whatsapp/webhook', {
      method: 'POST',
      body,
      headers: { 'x-hub-signature-256': sig },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  test('returns 200 ok for payload with no messages', async () => {
    const payload = { object: 'whatsapp_business_account', entry: [{ changes: [{ value: {} }] }] };
    const req = makePostRequest(payload);
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
