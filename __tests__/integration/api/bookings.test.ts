/** @jest-environment node */
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/bookings/route';
import { mockBookings } from '@/__tests__/fixtures';

const mockGetUser = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: mockGetUser },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: (resolve: Function) => Promise.resolve({ data: [], error: null }).then(resolve as () => void),
    })),
  })),
  createServiceClient: jest.fn(() => null),
}));

jest.mock('@/lib/stripe/server', () => ({
  createCheckoutSession: jest.fn().mockResolvedValue({
    id: 'cs_test_abc123',
    url: 'https://checkout.stripe.com/pay/cs_test_abc123',
  }),
  handleWebhookEvent: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  // Default: authenticated user
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123', email: 'maria@example.com' } } });
});

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(url, init);
}

// ─── GET /api/bookings ───────────────────────────────────────────────────────

describe('GET /api/bookings', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const req = makeRequest('http://localhost/api/bookings');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 200 with the user's bookings when authenticated", async () => {
    const req = makeRequest('http://localhost/api/bookings');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
  });

  it('filters by status when provided', async () => {
    const req = makeRequest('http://localhost/api/bookings?status=confirmed');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    // In-memory fallback returns an array; all entries match the status filter
    expect(Array.isArray(json.data)).toBe(true);
    json.data.forEach((b: { status: string }) => {
      expect(b.status).toBe('confirmed');
    });
  });
});

// ─── POST /api/bookings ──────────────────────────────────────────────────────

describe('POST /api/bookings', () => {
  // All required fields: listing_id, check_in, guest_name, guest_email
  const fullBooking = {
    listing_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    check_in: '2026-06-15',
    guest_name: 'Maria García',
    guest_email: 'maria@example.com',
    payment_method: 'arrival', // avoids Stripe API call in tests
  };

  it('returns 400 when required guest fields are missing', async () => {
    // guest_name and guest_email are required by createBookingSchema
    const req = makeRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        listing_id: 'some-id',
        check_in: '2026-06-15',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when required fields are missing', async () => {
    const req = makeRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ listing_id: 'not-a-uuid' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 401 when not authenticated on POST', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const req = makeRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify(fullBooking),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 422 when listing has no pricing (authenticated)', async () => {
    // The test listing ID is not in scraped-listings.json so route returns 422
    const req = makeRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify(fullBooking),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it('returns 422 when listing has no pricing available', async () => {
    // Route returns 422 when the listing is not found or has no price_usd
    const req = makeRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ ...fullBooking, listing_id: 'completely-unknown-listing-id' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });
});
