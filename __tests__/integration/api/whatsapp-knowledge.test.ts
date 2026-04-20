/** @jest-environment node */
/**
 * Integration tests for /api/whatsapp/knowledge (GET + PUT).
 *
 * TDD RED phase: tests auth gates, field whitelisting, partial updates,
 * and knowledge retrieval.
 */

import { NextRequest } from 'next/server';

// ─── Mock setup ──────────────────────────────────────────────────────────────

const mockGetUser = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
  createServiceClient: jest.fn(() => null),
}));

import { GET, PUT } from '@/app/api/whatsapp/knowledge/route';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function chainBuilder(terminalData: unknown = null, terminalError: unknown = null) {
  const chain: Record<string, jest.Mock> = {};
  ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq', 'order', 'limit'].forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain.single = jest.fn().mockResolvedValue({ data: terminalData, error: terminalError });
  return chain;
}

function setupAuth(userId = 'user-1') {
  mockGetUser.mockResolvedValue({ data: { user: { id: userId } } });
}

function setupProvider(providerId = 'prov-1') {
  mockFrom.mockImplementationOnce(() => chainBuilder({ id: providerId }));
}

function makePutRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/whatsapp/knowledge', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── GET /api/whatsapp/knowledge ─────────────────────────────────────────────

describe('GET /api/whatsapp/knowledge', () => {
  test('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  test('returns 404 when user has no provider', async () => {
    setupAuth();
    mockFrom.mockImplementationOnce(() => chainBuilder(null, { code: 'PGRST116' }));
    const res = await GET();
    expect(res.status).toBe(404);
  });

  test('returns knowledge data when exists', async () => {
    setupAuth();
    setupProvider();
    const knowledge = {
      id: 'know-1',
      provider_id: 'prov-1',
      property_description: 'Beautiful posada in the mountains',
      room_types: [{ name: 'Suite', capacity: 2, price_usd: 100 }],
      amenities: ['WiFi', 'Pool'],
    };
    mockFrom.mockImplementationOnce(() => chainBuilder(knowledge));

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.property_description).toBe('Beautiful posada in the mountains');
    expect(json.data.room_types).toHaveLength(1);
  });

  test('returns null data when no knowledge exists', async () => {
    setupAuth();
    setupProvider();
    mockFrom.mockImplementationOnce(() => chainBuilder(null, { code: 'PGRST116' }));

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toBeNull();
  });
});

// ─── PUT /api/whatsapp/knowledge ─────────────────────────────────────────────

describe('PUT /api/whatsapp/knowledge', () => {
  test('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await PUT(makePutRequest({ property_description: 'Test' }));
    expect(res.status).toBe(401);
  });

  test('returns 400 for invalid JSON', async () => {
    setupAuth();
    setupProvider();
    const req = new NextRequest('http://localhost/api/whatsapp/knowledge', {
      method: 'PUT',
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  test('accepts partial updates — only whitelisted fields', async () => {
    setupAuth();
    setupProvider();
    const updated = {
      id: 'know-1',
      provider_id: 'prov-1',
      property_description: 'Updated description',
    };
    mockFrom.mockImplementationOnce(() => chainBuilder(updated));

    const res = await PUT(
      makePutRequest({
        property_description: 'Updated description',
        id: 'inject-id',          // should be stripped
        provider_id: 'inject-pid', // should be stripped
        created_at: 'inject-date', // should be stripped
      })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.property_description).toBe('Updated description');
  });

  test('upserts room types', async () => {
    setupAuth();
    setupProvider();
    const rooms = [
      { name: 'Cloud Room', capacity: 2, price_usd: 90, description: 'Mountain views', amenities: ['WiFi'] },
    ];
    mockFrom.mockImplementationOnce(() => chainBuilder({ room_types: rooms }));

    const res = await PUT(makePutRequest({ room_types: rooms }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.room_types).toHaveLength(1);
    expect(json.data.room_types[0].name).toBe('Cloud Room');
  });

  test('upserts pricing rules', async () => {
    setupAuth();
    setupProvider();
    const pricingRules = {
      weekend_premium: 0.15,
      seasonal_periods: [
        { name: 'High Season', multiplier: 1.3, dates: [{ start: '2026-12-15', end: '2027-01-05' }] },
      ],
    };
    mockFrom.mockImplementationOnce(() => chainBuilder({ pricing_rules: pricingRules }));

    const res = await PUT(makePutRequest({ pricing_rules: pricingRules }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.pricing_rules.weekend_premium).toBe(0.15);
  });

  test('upserts FAQs', async () => {
    setupAuth();
    setupProvider();
    const faqs = [
      { question: 'Is breakfast included?', answer: 'Yes, a full breakfast is included.' },
      { question: 'Can I bring pets?', answer: 'Small dogs are welcome.' },
    ];
    mockFrom.mockImplementationOnce(() => chainBuilder({ faqs }));

    const res = await PUT(makePutRequest({ faqs }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.faqs).toHaveLength(2);
  });

  test('returns 500 on Supabase error', async () => {
    setupAuth();
    setupProvider();
    mockFrom.mockImplementationOnce(() =>
      chainBuilder(null, { message: 'Database connection failed' })
    );

    const res = await PUT(makePutRequest({ property_description: 'Test' }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('Database connection failed');
  });
});
