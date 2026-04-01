/** @jest-environment node */
import { NextRequest } from 'next/server';
import { mockReview } from '@/__tests__/fixtures';

const mockFrom = jest.fn();
const mockAuth = { getUser: jest.fn() };

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({ auth: mockAuth, from: mockFrom })),
}));

function buildQuery(response: { data: unknown; error: unknown }) {
  const q: Record<string, jest.Mock> = {};
  ['select', 'eq', 'order', 'limit'].forEach((m) => { q[m] = jest.fn().mockReturnThis(); });
  q.single = jest.fn().mockResolvedValue(response);
  q.insert = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue(response),
    }),
  });
  (q as unknown as { then: Function }).then = (resolve: Function) =>
    Promise.resolve(response).then(resolve as () => void);
  return q;
}

beforeEach(() => jest.clearAllMocks());

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(url, init);
}

// ─── GET /api/listings/[id]/reviews ─────────────────────────────────────────

describe('GET /api/listings/[id]/reviews', () => {
  it('returns reviews for a listing', async () => {
    const { GET } = await import('@/app/api/listings/[id]/reviews/route');

    const q = buildQuery({ data: [mockReview], error: null });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/listings/listing-uuid-1/reviews');
    const res = await GET(req, { params: Promise.resolve({ id: 'listing-uuid-1' }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toBeDefined();
  });

  it('returns 500 on database error', async () => {
    const { GET } = await import('@/app/api/listings/[id]/reviews/route');

    const q = buildQuery({ data: null, error: { message: 'DB error' } });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/listings/listing-uuid-1/reviews');
    const res = await GET(req, { params: Promise.resolve({ id: 'listing-uuid-1' }) });
    expect(res.status).toBe(500);
  });
});

// ─── POST /api/listings/[id]/reviews ────────────────────────────────────────

describe('POST /api/listings/[id]/reviews', () => {
  const validReview = {
    booking_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    rating: 5,
    body: 'Absolutely incredible experience, highly recommended to everyone visiting Venezuela!',
  };

  it('returns 401 when unauthenticated', async () => {
    const { POST } = await import('@/app/api/listings/[id]/reviews/route');
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });

    const req = makeRequest('http://localhost/api/listings/listing-uuid-1/reviews', {
      method: 'POST',
      body: JSON.stringify(validReview),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req, { params: Promise.resolve({ id: 'listing-uuid-1' }) });
    expect(res.status).toBe(401);
  });

  it('rejects review without a completed booking', async () => {
    const { POST } = await import('@/app/api/listings/[id]/reviews/route');
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    // No completed booking found
    const q = buildQuery({ data: null, error: null });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/listings/listing-uuid-1/reviews', {
      method: 'POST',
      body: JSON.stringify(validReview),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req, { params: Promise.resolve({ id: 'listing-uuid-1' }) });
    // Should be 403 (no verified booking)
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('returns 400 on invalid rating', async () => {
    const { POST } = await import('@/app/api/listings/[id]/reviews/route');
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const q = buildQuery({ data: { id: 'booking-1' }, error: null });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/listings/listing-uuid-1/reviews', {
      method: 'POST',
      body: JSON.stringify({ ...validReview, rating: 10 }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req, { params: Promise.resolve({ id: 'listing-uuid-1' }) });
    expect(res.status).toBe(400);
  });
});
