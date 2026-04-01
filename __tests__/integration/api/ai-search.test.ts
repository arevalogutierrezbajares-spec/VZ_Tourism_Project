/** @jest-environment node */
import { NextRequest } from 'next/server';

const mockStreamSearch = jest.fn();

jest.mock('@/lib/claude/client', () => ({
  streamSearch: mockStreamSearch,
}));

const mockFrom = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    from: mockFrom,
  })),
  createServiceClient: jest.fn(() => ({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    from: mockFrom,
  })),
}));

beforeEach(() => {
  jest.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = 'test-key-for-testing';
});

afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
});

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/ai/search', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── POST /api/ai/search ─────────────────────────────────────────────────────

describe('POST /api/ai/search', () => {
  it('returns 400 when query is empty', async () => {
    const { POST } = await import('@/app/api/ai/search/route');
    const req = makeRequest({ query: '' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Query');
  });

  it('returns 503 when ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { POST } = await import('@/app/api/ai/search/route');
    const req = makeRequest({ query: 'Find beaches' });
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it('returns a streaming response for valid query', async () => {
    mockStreamSearch.mockImplementation(async (_messages: unknown[], onText: (t: string) => void) => {
      onText('Here are great beaches in Venezuela!');
    });

    const { POST } = await import('@/app/api/ai/search/route');
    const req = makeRequest({ query: 'Find beaches in Los Roques' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/event-stream');
  });

  it('returns SSE content-type for streaming', async () => {
    mockStreamSearch.mockImplementation(async () => {});
    const { POST } = await import('@/app/api/ai/search/route');
    const req = makeRequest({ query: 'Adventure tours in Mérida' });
    const res = await POST(req);
    expect(res.headers.get('Content-Type')).toContain('text/event-stream');
    expect(res.headers.get('Cache-Control')).toContain('no-cache');
  });

  it('includes conversation context for follow-up queries', async () => {
    let capturedMessages: unknown[] = [];
    mockStreamSearch.mockImplementation(async (messages: unknown[]) => {
      capturedMessages = messages;
    });

    const { POST } = await import('@/app/api/ai/search/route');
    const req = makeRequest({
      query: 'What about snorkeling there?',
      conversationHistory: [
        { role: 'user', content: 'Tell me about Los Roques' },
        { role: 'assistant', content: 'Los Roques is a beautiful archipelago...' },
      ],
    });
    await POST(req);

    // Should have history + current query = 3 messages total
    expect(capturedMessages).toHaveLength(3);
  });

  it('handles search_listings tool call', async () => {
    const mockListingData = [{ id: 'l1', title: 'Beach Trip', slug: 'beach-trip' }];

    mockStreamSearch.mockImplementation(
      async (
        _messages: unknown[],
        onText: (t: string) => void,
        handleToolCall: (name: string, input: Record<string, unknown>) => Promise<unknown>
      ) => {
        const result = await handleToolCall('search_listings', { category: 'beaches' });
        onText('Found some listings!');
        return result;
      }
    );

    // Mock supabase listings query
    const q: Record<string, jest.Mock> = {};
    ['select', 'eq', 'gte', 'lte', 'overlaps', 'ilike', 'limit'].forEach((m) => {
      q[m] = jest.fn().mockReturnThis();
    });
    (q as unknown as { then: Function }).then = (resolve: Function) =>
      Promise.resolve({ data: mockListingData, error: null }).then(resolve as () => void);
    mockFrom.mockReturnValue(q);

    const { POST } = await import('@/app/api/ai/search/route');
    const req = makeRequest({ query: 'Find beaches' });
    const res = await POST(req);

    expect(res.status).toBe(200);
  });
});
