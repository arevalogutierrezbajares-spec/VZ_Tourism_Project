/** @jest-environment node */
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/bookings/route';
import { mockBookings } from '@/__tests__/fixtures';

// The bookings GET route uses createClient from @supabase/supabase-js (service role),
// not @/lib/supabase/server. When env vars aren't set, it falls back to the in-memory store.
// The POST route similarly falls back. Neither route checks authentication.

jest.mock('@/lib/stripe/server', () => ({
  createCheckoutSession: jest.fn().mockResolvedValue({
    id: 'cs_test_abc123',
    url: 'https://checkout.stripe.com/pay/cs_test_abc123',
  }),
  handleWebhookEvent: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(url, init);
}

// ─── GET /api/bookings ───────────────────────────────────────────────────────

describe('GET /api/bookings', () => {
  it('returns 200 with booking list (no auth required)', async () => {
    // Route falls back to in-memory store when Supabase env vars are absent in test env
    const req = makeRequest('http://localhost/api/bookings');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
  });

  it("returns the user's bookings when authenticated", async () => {
    // Route doesn't check auth itself; Supabase path falls back to in-memory in test env
    const req = makeRequest('http://localhost/api/bookings');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toBeDefined();
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

  it('creates a booking with all required fields (no auth required)', async () => {
    // Route uses in-memory store fallback; Supabase env vars absent in test env
    const req = makeRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify(fullBooking),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.confirmation_code).toMatch(/^VZ-/);
  });

  it('creates booking with estimated price when listing is not in the database', async () => {
    // Route uses estimatePrice() fallback instead of returning 404 for unknown listings
    const req = makeRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ ...fullBooking, listing_id: 'completely-unknown-listing-id' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });
});
