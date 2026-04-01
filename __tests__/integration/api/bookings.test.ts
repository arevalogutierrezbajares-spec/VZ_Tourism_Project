/** @jest-environment node */
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/bookings/route';
import { mockBookings, mockBooking } from '@/__tests__/fixtures';

const mockFrom = jest.fn();
const mockAuth = { getUser: jest.fn() };

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({ auth: mockAuth, from: mockFrom })),
  createServiceClient: jest.fn(() => ({ auth: mockAuth, from: mockFrom })),
}));

function buildQuery(response: { data: unknown; error: unknown; count?: number | null }) {
  const q: Record<string, jest.Mock> = {};
  ['select', 'eq', 'in', 'order', 'range', 'limit', 'update'].forEach((m) => {
    q[m] = jest.fn().mockReturnThis();
  });
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

// ─── GET /api/bookings ───────────────────────────────────────────────────────

describe('GET /api/bookings', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });
    const req = makeRequest('http://localhost/api/bookings');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns the user's bookings when authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // users role query
        return buildQuery({ data: { role: 'tourist' }, error: null });
      }
      // bookings query
      return buildQuery({ data: mockBookings, error: null, count: 2 });
    });

    const req = makeRequest('http://localhost/api/bookings');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toBeDefined();
  });

  it('filters by status when provided', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    let callCount = 0;
    const bookingsQuery = buildQuery({ data: mockBookings, error: null, count: 2 });
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildQuery({ data: { role: 'tourist' }, error: null });
      return bookingsQuery;
    });

    const req = makeRequest('http://localhost/api/bookings?status=confirmed');
    await GET(req);

    expect(bookingsQuery.eq).toHaveBeenCalledWith('status', 'confirmed');
  });
});

// ─── POST /api/bookings ──────────────────────────────────────────────────────

describe('POST /api/bookings', () => {
  const validBooking = {
    listing_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    check_in: '2026-04-15',
    guests: 2,
  };

  it('returns 401 when unauthenticated', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });
    const req = makeRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify(validBooking),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const req = makeRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ listing_id: 'not-a-uuid' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('creates a booking for authenticated user with valid listing', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // listing lookup
        return buildQuery({ data: { price_usd: 85, is_published: true }, error: null });
      }
      // bookings insert
      return {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockBooking, error: null }),
          }),
        }),
      };
    });

    const req = makeRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify(validBooking),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it('returns 404 when listing is not available', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const q = buildQuery({ data: null, error: null });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify(validBooking),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});
