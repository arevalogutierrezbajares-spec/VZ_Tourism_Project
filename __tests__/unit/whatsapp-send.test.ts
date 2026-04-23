/**
 * @jest-environment node
 *
 * Unit tests for sendAndPersist — outbound WhatsApp message sender.
 * Tests idempotency, 24-hour window enforcement, and database persistence.
 */

import type { ServiceClient } from '@/types/supabase-client';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/lib/whatsapp-api', () => ({
  sendWhatsAppText: jest.fn(),
  sendWhatsAppTemplate: jest.fn(),
}));

jest.mock('@/lib/whatsapp-window', () => ({
  isWindowOpen: jest.fn(),
}));

import { sendAndPersist } from '@/lib/whatsapp-send';
import { sendWhatsAppText, sendWhatsAppTemplate } from '@/lib/whatsapp-api';
import { isWindowOpen } from '@/lib/whatsapp-window';

const mockSendText = sendWhatsAppText as jest.MockedFunction<typeof sendWhatsAppText>;
const mockSendTemplate = sendWhatsAppTemplate as jest.MockedFunction<typeof sendWhatsAppTemplate>;
const mockIsWindowOpen = isWindowOpen as jest.MockedFunction<typeof isWindowOpen>;

// Minimal config for tests
const TEST_CONFIG = {
  id: 'cfg-1',
  provider_id: 'prov-1',
  phone_number_id: '1234567890',
  access_token: 'test-token',
  verify_token: 'test-verify',
  persona_name: 'Test',
  persona_bio: null,
  greeting_style: 'friendly' as const,
  custom_greeting: null,
  tone_formality: 'casual' as const,
  tone_language: 'es' as const,
  response_length: 'standard' as const,
  booking_pressure: 'soft' as const,
  emoji_style: 'moderate' as const,
  upsell_enabled: true,
  sentiment_threshold: 0.3,
  value_escalation_usd: 0,
  escalation_keywords: [],
  response_delay_ms: 0,
  working_hours_enabled: false,
  working_hours: null,
  after_hours_message: null,
  custom_instructions: null,
  ai_enabled: true,
  operator_phone: null,
  notify_escalations: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// Build a mock Supabase client with configurable responses
function createMockSupabase(overrides?: {
  idempotencyCount?: number;
  lastCustomerMessageAt?: string | null;
  insertResult?: { id: string } | null;
  insertError?: { message: string; code?: string } | null;
}) {
  const opts = {
    idempotencyCount: 0,
    lastCustomerMessageAt: new Date().toISOString(),
    insertResult: { id: 'msg-1' },
    insertError: null,
    ...overrides,
  };

  const rpcFn = jest.fn().mockResolvedValue({ error: null });
  let fromCallCount = 0;

  return {
    supabase: {
      from: (table: string) => {
        fromCallCount++;
        if (table === 'wa_messages') {
          // Distinguish between idempotency check (select with count) and insert
          return {
            select: (_cols: string, selectOpts?: { count?: string; head?: boolean }) => {
              if (selectOpts?.count === 'exact') {
                // Idempotency check
                return {
                  eq: function () { return this; },
                  then: (resolve: (v: { count: number }) => void) => resolve({ count: opts.idempotencyCount }),
                  [Symbol.toStringTag]: 'Promise',
                  catch: (fn: () => void) => ({ then: (r: () => void) => r() }),
                } as unknown as Promise<{ count: number }>;
              }
              // Regular select after insert
              return {
                single: () => Promise.resolve({
                  data: opts.insertResult,
                  error: opts.insertError,
                }),
              };
            },
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({
                  data: opts.insertError ? null : opts.insertResult,
                  error: opts.insertError,
                }),
              }),
            }),
            eq: function () { return this; },
          };
        }
        if (table === 'wa_conversations') {
          return {
            select: () => ({
              eq: function () { return this; },
              single: () => Promise.resolve({
                data: { last_customer_message_at: opts.lastCustomerMessageAt },
                error: null,
              }),
            }),
            update: () => ({
              eq: function () { return this; },
              then: (resolve: () => void) => resolve(),
              [Symbol.toStringTag]: 'Promise',
              catch: () => ({}),
            }),
          };
        }
        return {};
      },
      rpc: rpcFn,
    } as unknown as ServiceClient,
    rpcFn,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsWindowOpen.mockReturnValue(true);
  mockSendText.mockResolvedValue({ success: true, messageId: 'wamid.123' });
  mockSendTemplate.mockResolvedValue({ success: true, messageId: 'wamid.456' });
});

// ─── Happy path: sends text and persists ─────────────────────────────────────

test('sends text message when window is open', async () => {
  const { supabase } = createMockSupabase();

  await sendAndPersist(supabase, 'conv-1', TEST_CONFIG, 'token', '+58414111', 'Hola!', true);

  expect(mockSendText).toHaveBeenCalledWith(
    expect.objectContaining({
      phoneNumberId: '1234567890',
      to: '+58414111',
      body: 'Hola!',
    })
  );
  expect(mockSendTemplate).not.toHaveBeenCalled();
});

// ─── Idempotency: skips duplicate ────────────────────────────────────────────

test('skips send when idempotency key already exists', async () => {
  const { supabase } = createMockSupabase({ idempotencyCount: 1 });
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

  await sendAndPersist(supabase, 'conv-1', TEST_CONFIG, 'token', '+58414111', 'Hola!', true);

  expect(mockSendText).not.toHaveBeenCalled();
  expect(mockSendTemplate).not.toHaveBeenCalled();
  expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Duplicate outbound detected'));

  warnSpy.mockRestore();
});

// ─── Window expired: falls back to template ──────────────────────────────────

test('sends template when 24h window is expired', async () => {
  mockIsWindowOpen.mockReturnValue(false);
  const { supabase } = createMockSupabase();

  await sendAndPersist(supabase, 'conv-1', TEST_CONFIG, 'token', '+58414111', 'Hola!', true, 'es');

  expect(mockSendTemplate).toHaveBeenCalledWith(
    expect.objectContaining({
      templateName: 'reengagement_greeting',
      languageCode: 'es',
    })
  );
  expect(mockSendText).not.toHaveBeenCalled();
});

test('sends template with en language code for English speakers', async () => {
  mockIsWindowOpen.mockReturnValue(false);
  const { supabase } = createMockSupabase();

  await sendAndPersist(supabase, 'conv-1', TEST_CONFIG, 'token', '+58414111', 'Hello!', true, 'en');

  expect(mockSendTemplate).toHaveBeenCalledWith(
    expect.objectContaining({ languageCode: 'en' })
  );
});

// ─── Unique constraint violation: caught at insert ───────────────────────────

test('catches unique constraint violation at insert as duplicate', async () => {
  const { supabase } = createMockSupabase({
    insertError: { message: 'duplicate key', code: '23505' },
  });
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

  await sendAndPersist(supabase, 'conv-1', TEST_CONFIG, 'token', '+58414111', 'Hola!', true);

  // The WhatsApp message was sent (can't un-send), but the DB write caught the dupe
  expect(mockSendText).toHaveBeenCalled();
  expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Duplicate outbound caught at insert'));

  warnSpy.mockRestore();
});

// ─── content_es RPC called when translation provided ─────────────────────────

test('calls set_message_content_es RPC when contentEs is provided', async () => {
  const { supabase, rpcFn } = createMockSupabase();

  await sendAndPersist(
    supabase, 'conv-1', TEST_CONFIG, 'token', '+58414111',
    'Hello!', true, 'en', 'Hello!', '¡Hola!'
  );

  expect(rpcFn).toHaveBeenCalledWith('set_message_content_es', {
    msg_id: 'msg-1',
    es_text: '¡Hola!',
  });
});

test('does not call RPC when contentEs is not provided', async () => {
  const { supabase, rpcFn } = createMockSupabase();

  await sendAndPersist(supabase, 'conv-1', TEST_CONFIG, 'token', '+58414111', 'Hola!', true);

  expect(rpcFn).not.toHaveBeenCalled();
});
