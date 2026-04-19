/** @jest-environment node */
import { NextRequest } from 'next/server';

const mockFrom = jest.fn();
const mockAuth = { getUser: jest.fn() };

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({ auth: mockAuth, from: mockFrom })),
  createServiceClient: jest.fn(() => ({ auth: mockAuth, from: mockFrom })),
}));

function buildQuery(response: { data: unknown; error: unknown }) {
  const q: Record<string, jest.Mock> = {};
  ['select', 'eq', 'update', 'order', 'in', 'insert', 'single'].forEach((m) => { q[m] = jest.fn().mockReturnThis(); });
  q.single = jest.fn().mockResolvedValue(response);
  (q as unknown as { then: Function }).then = (resolve: Function) =>
    Promise.resolve(response).then(resolve as () => void);
  return q;
}

beforeEach(() => jest.clearAllMocks());

function makeRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── POST /api/discount-codes/validate ──────────────────────────────────────

describe('POST /api/discount-codes/validate', () => {
  it('returns 410 with valid:false when code has reached max_uses', async () => {
    const { POST } = await import('@/app/api/discount-codes/validate/route');

    const q = buildQuery({
      data: {
        id: 'code-id-1',
        creator_id: 'creator-1',
        type: 'percentage',
        value: 10,
        min_booking_usd: 0,
        max_uses: 10,
        times_used: 10,
        expires_at: null,
        status: 'active',
      },
      error: null,
    });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/discount-codes/validate', {
      code: 'TEST10',
      booking_total_usd: 100,
    });
    const res = await POST(req);

    expect(res.status).toBe(410);
    const json = await res.json();
    expect(json.valid).toBe(false);
    expect(json.error).toMatch(/usage limit/i);
  });

  it('returns 200 with correct percentage discount calculation', async () => {
    const { POST } = await import('@/app/api/discount-codes/validate/route');

    const q = buildQuery({
      data: {
        id: 'code-id-2',
        creator_id: 'creator-2',
        type: 'percentage',
        value: 20,
        min_booking_usd: 0,
        max_uses: null,
        times_used: 0,
        expires_at: null,
        status: 'active',
      },
      error: null,
    });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/discount-codes/validate', {
      code: 'SAVE20',
      booking_total_usd: 100,
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.valid).toBe(true);
    expect(json.discount_amount_usd).toBe(20);
    expect(json.net_total_usd).toBe(80);
  });
});

// ─── GET /api/discount-codes/check ──────────────────────────────────────────

describe('GET /api/discount-codes/check', () => {
  it('returns availability for each code and exposes no sensitive fields', async () => {
    const { GET } = await import('@/app/api/discount-codes/check/route');

    // Simulate the `.in()` terminal resolving with only the taken code
    const q: Record<string, jest.Mock> = {};
    ['select', 'eq', 'update', 'order', 'single'].forEach((m) => { q[m] = jest.fn().mockReturnThis(); });
    q.in = jest.fn().mockResolvedValue({ data: [{ code: 'TAKEN' }], error: null });
    (q as unknown as { then: Function }).then = (resolve: Function) =>
      Promise.resolve({ data: [{ code: 'TAKEN' }], error: null }).then(resolve as () => void);
    mockFrom.mockReturnValue(q);

    const req = new NextRequest('http://localhost/api/discount-codes/check?codes=TAKEN,FREE', {
      method: 'GET',
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.results).toEqual(
      expect.arrayContaining([
        { code: 'TAKEN', available: false },
        { code: 'FREE', available: true },
      ])
    );

    // No sensitive fields should leak through
    const resultKeys = json.results.flatMap((r: Record<string, unknown>) => Object.keys(r));
    expect(resultKeys).not.toContain('creator_id');
    expect(resultKeys).not.toContain('taken_by');
    expect(resultKeys).not.toContain('times_used');
  });
});

// ─── POST /api/discount-codes ────────────────────────────────────────────────

describe('POST /api/discount-codes', () => {
  it('returns 403 when discount_codes_enabled is false on the creator profile', async () => {
    const { POST } = await import('@/app/api/discount-codes/route');

    mockAuth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    // First from() call: creator_profiles query returning disabled profile
    const profileQuery = buildQuery({
      data: { id: 'creator-1', discount_codes_enabled: false },
      error: null,
    });
    mockFrom.mockReturnValue(profileQuery);

    const req = makeRequest('http://localhost/api/discount-codes', {
      code: 'MY10',
      type: 'percentage',
      value: 10,
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/not enabled/i);
  });

  it('returns 409 when the code already exists (duplicate key error)', async () => {
    const { POST } = await import('@/app/api/discount-codes/route');

    mockAuth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    // First from() call: creator_profiles query returning enabled profile
    const profileQuery = buildQuery({
      data: { id: 'creator-1', discount_codes_enabled: true },
      error: null,
    });

    // Second from() call: insert that returns a duplicate key violation
    const insertQuery: Record<string, jest.Mock> = {};
    ['select', 'eq', 'update', 'order', 'in', 'insert'].forEach((m) => { insertQuery[m] = jest.fn().mockReturnThis(); });
    insertQuery.single = jest.fn().mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    });
    (insertQuery as unknown as { then: Function }).then = (resolve: Function) =>
      Promise.resolve({ data: null, error: { code: '23505', message: 'duplicate key' } }).then(
        resolve as () => void
      );

    mockFrom
      .mockReturnValueOnce(profileQuery)
      .mockReturnValueOnce(insertQuery);

    const req = makeRequest('http://localhost/api/discount-codes', {
      code: 'CARLOS20',
      type: 'percentage',
      value: 20,
    });
    const res = await POST(req);

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe('Code already taken');
  });
});
