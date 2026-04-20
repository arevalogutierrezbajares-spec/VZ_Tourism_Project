/** @jest-environment node */
/**
 * Unit tests for sendWhatsAppText() and markWhatsAppRead().
 *
 * TDD RED phase: tests the WhatsApp Cloud API client's request formatting,
 * error handling, timeout behavior, and token cleanup.
 */

import { sendWhatsAppText, markWhatsAppRead } from '@/lib/whatsapp-api';

// ─── Mock fetch ──────────────────────────────────────────────────────────────

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

// ─── sendWhatsAppText ────────────────────────────────────────────────────────

describe('sendWhatsAppText', () => {
  const opts = {
    phoneNumberId: '123456789',
    accessToken: 'EAAx_test_token',
    to: '584141234567',
    body: 'Hola! Bienvenido a nuestra posada.',
  };

  test('sends correct POST to Meta Cloud API v21.0', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [{ id: 'wamid.abc123' }] }), { status: 200 })
    );

    const result = await sendWhatsAppText(opts);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toBe('https://graph.facebook.com/v21.0/123456789/messages');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer EAAx_test_token',
        'Content-Type': 'application/json',
      })
    );

    const body = JSON.parse(init?.body as string);
    expect(body).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '584141234567',
      type: 'text',
      text: { preview_url: false, body: 'Hola! Bienvenido a nuestra posada.' },
    });

    expect(result).toEqual({ success: true, messageId: 'wamid.abc123' });
  });

  test('returns success with messageId from response', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [{ id: 'wamid.xyz789' }] }), { status: 200 })
    );

    const result = await sendWhatsAppText(opts);
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('wamid.xyz789');
  });

  test('returns error on non-200 response', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('{"error":{"message":"Invalid token"}}', { status: 401 })
    );

    const result = await sendWhatsAppText(opts);
    expect(result.success).toBe(false);
    expect(result.error).toContain('401');
    expect(result.error).toContain('Invalid token');
  });

  test('returns error on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

    const result = await sendWhatsAppText(opts);
    expect(result.success).toBe(false);
    expect(result.error).toContain('fetch error');
    expect(result.error).toContain('Network timeout');
  });

  test('strips whitespace from access token', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [{ id: 'wamid.1' }] }), { status: 200 })
    );

    await sendWhatsAppText({
      ...opts,
      accessToken: '  EAAx_token_with_spaces  \n',
    });

    const [, init] = mockFetch.mock.calls[0]!;
    const authHeader = (init?.headers as Record<string, string>)['Authorization'];
    expect(authHeader).toBe('Bearer EAAx_token_with_spaces');
    expect(authHeader).not.toContain(' \n');
  });

  test('handles missing messages array in response gracefully', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 })
    );

    const result = await sendWhatsAppText(opts);
    expect(result.success).toBe(true);
    expect(result.messageId).toBeUndefined();
  });

  test('uses abort signal with 8s timeout', async () => {
    // Verify that an AbortController signal is passed
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [{ id: 'wamid.1' }] }), { status: 200 })
    );

    await sendWhatsAppText(opts);

    const [, init] = mockFetch.mock.calls[0]!;
    expect(init?.signal).toBeDefined();
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });
});

// ─── markWhatsAppRead ────────────────────────────────────────────────────────

describe('markWhatsAppRead', () => {
  const opts = {
    phoneNumberId: '123456789',
    accessToken: 'EAAx_test_token',
    messageId: 'wamid.abc123',
  };

  test('sends correct POST with read status', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    const result = await markWhatsAppRead(opts);

    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toBe('https://graph.facebook.com/v21.0/123456789/messages');

    const body = JSON.parse(init?.body as string);
    expect(body).toEqual({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: 'wamid.abc123',
    });

    expect(result.success).toBe(true);
  });

  test('returns error on API failure', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('Rate limit exceeded', { status: 429 })
    );

    const result = await markWhatsAppRead(opts);
    expect(result.success).toBe(false);
    expect(result.error).toContain('429');
  });
});
