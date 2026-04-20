/** @jest-environment node */
/**
 * Unit tests for POST /api/whatsapp/test-reply
 *
 * Verifies: auth gating, input validation, config merge with defaults,
 * Groq mock integration, and error paths (empty response, Groq failure).
 */

import { NextRequest } from 'next/server';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockGetUser = jest.fn();
const mockCreateClient = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
  createServiceClient: jest.fn(() => null),
}));

const mockGroqCreate = jest.fn();
jest.mock('@/lib/groq', () => ({
  getGroqClient: () => ({
    chat: {
      completions: {
        create: mockGroqCreate,
      },
    },
  }),
  GROQ_MODEL: 'test-model',
}));

jest.mock('@/lib/whatsapp-ai', () => ({
  buildSystemPrompt: jest.fn(() => 'mocked-system-prompt'),
}));

import { POST } from '@/app/api/whatsapp/test-reply/route';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/whatsapp/test-reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function supabaseWithUser(user: { id: string; email: string } | null) {
  mockCreateClient.mockReturnValue({
    auth: {
      getUser: () => Promise.resolve({ data: { user } }),
    },
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/whatsapp/test-reply', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGroqCreate.mockResolvedValue({
      choices: [{ message: { content: 'Hola, bienvenido a nuestra posada.' } }],
    });
  });

  it('returns 503 when supabase is unavailable', async () => {
    mockCreateClient.mockReturnValue(null);
    const res = await POST(makeRequest({ message: 'test' }));
    expect(res.status).toBe(503);
  });

  it('returns 401 when user is not authenticated', async () => {
    supabaseWithUser(null);
    const res = await POST(makeRequest({ message: 'test' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when message is missing', async () => {
    supabaseWithUser({ id: 'u1', email: 'a@b.com' });
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/message is required/);
  });

  it('returns 400 when message exceeds 1000 chars', async () => {
    supabaseWithUser({ id: 'u1', email: 'a@b.com' });
    const res = await POST(makeRequest({ message: 'x'.repeat(1001) }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON', async () => {
    supabaseWithUser({ id: 'u1', email: 'a@b.com' });
    const req = new NextRequest('http://localhost/api/whatsapp/test-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{{{',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns a reply on success', async () => {
    supabaseWithUser({ id: 'u1', email: 'a@b.com' });
    const res = await POST(makeRequest({ message: 'Hola, quiero reservar' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reply).toBe('Hola, bienvenido a nuestra posada.');
    expect(mockGroqCreate).toHaveBeenCalledTimes(1);
  });

  it('merges partial config with defaults', async () => {
    supabaseWithUser({ id: 'u1', email: 'a@b.com' });
    await POST(makeRequest({
      message: 'test',
      config: { persona_name: 'Luna', tone_language: 'en' },
    }));

    const { buildSystemPrompt } = require('@/lib/whatsapp-ai');
    const call = (buildSystemPrompt as jest.Mock).mock.calls[0][0];
    expect(call.config.persona_name).toBe('Luna');
    expect(call.config.tone_language).toBe('en');
    // Defaults should still be present
    expect(call.config.greeting_style).toBe('friendly');
  });

  it('returns 502 when Groq returns empty response', async () => {
    supabaseWithUser({ id: 'u1', email: 'a@b.com' });
    mockGroqCreate.mockResolvedValue({
      choices: [{ message: { content: '' } }],
    });
    const res = await POST(makeRequest({ message: 'test' }));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toMatch(/empty/i);
  });

  it('returns 502 when Groq throws', async () => {
    supabaseWithUser({ id: 'u1', email: 'a@b.com' });
    mockGroqCreate.mockRejectedValue(new Error('Groq API down'));
    const res = await POST(makeRequest({ message: 'test' }));
    expect(res.status).toBe(502);
  });

  it('uses max_tokens 150 for brief response_length', async () => {
    supabaseWithUser({ id: 'u1', email: 'a@b.com' });
    await POST(makeRequest({
      message: 'test',
      config: { response_length: 'brief' },
    }));
    expect(mockGroqCreate).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 150 }),
    );
  });
});
