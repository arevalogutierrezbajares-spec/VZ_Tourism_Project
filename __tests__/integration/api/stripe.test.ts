/** @jest-environment node */
import { NextRequest } from 'next/server';
import { mockCheckoutSession } from '@/__tests__/mocks/stripe';

const mockCreateCheckoutSession = jest.fn().mockResolvedValue(mockCheckoutSession);
const mockHandleWebhookEvent = jest.fn();

jest.mock('@/lib/stripe/server', () => ({
  createCheckoutSession: mockCreateCheckoutSession,
  handleWebhookEvent: mockHandleWebhookEvent,
}));

const mockFrom = jest.fn();
const mockAuth = { getUser: jest.fn() };

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({ auth: mockAuth, from: mockFrom })),
  createServiceClient: jest.fn(() => ({ auth: mockAuth, from: mockFrom })),
}));

// The checkout route reads bookings from bookings-store (in-memory), not Supabase
const mockGetBooking = jest.fn();
const mockUpdateBookingStatus = jest.fn();
jest.mock('@/lib/bookings-store', () => ({
  getBooking: mockGetBooking,
  updateBookingStatus: mockUpdateBookingStatus,
  createBooking: jest.fn(),
  getAllBookings: jest.fn().mockReturnValue([]),
  getBookingsByEmail: jest.fn().mockReturnValue([]),
}));

function buildQuery(response: { data: unknown; error: unknown }) {
  const q: Record<string, jest.Mock> = {};
  ['select', 'eq', 'update', 'order'].forEach((m) => { q[m] = jest.fn().mockReturnThis(); });
  q.single = jest.fn().mockResolvedValue(response);
  (q as unknown as { then: Function }).then = (resolve: Function) =>
    Promise.resolve(response).then(resolve as () => void);
  return q;
}

beforeEach(() => jest.clearAllMocks());

function makeRequest(url: string, body: unknown, headers?: Record<string, string>) {
  return new NextRequest(url, {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

// ─── POST /api/stripe/checkout ───────────────────────────────────────────────

describe('POST /api/stripe/checkout', () => {
  // The checkout route reads bookings from bookings-store (no auth check, no Supabase)
  it('returns 404 when booking does not exist in store (no auth required)', async () => {
    const { POST } = await import('@/app/api/stripe/checkout/route');
    mockGetBooking.mockReturnValueOnce(undefined);

    const req = makeRequest('http://localhost/api/stripe/checkout', { bookingId: 'booking-1' });
    const res = await POST(req);
    // No auth guard — returns 404 (booking not found), not 401
    expect(res.status).toBe(404);
  });

  it('returns 400 when bookingId is missing', async () => {
    const { POST } = await import('@/app/api/stripe/checkout/route');

    const req = makeRequest('http://localhost/api/stripe/checkout', {});
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('bookingId');
  });

  it('creates a checkout session with correct amount', async () => {
    const { POST } = await import('@/app/api/stripe/checkout/route');
    mockGetBooking.mockReturnValueOnce({
      id: 'booking-1',
      total_usd: 170,
      status: 'pending',
      listing_name: 'Mérida Trek',
      guest_email: 'test@example.com',
      listing_slug: 'merida-trek',
    });

    const req = makeRequest('http://localhost/api/stripe/checkout', { bookingId: 'booking-1' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ amountUsd: 170 })
    );
    const json = await res.json();
    expect(json.sessionId).toBe('cs_test_abc123');
  });

  it('returns 404 when booking not found', async () => {
    const { POST } = await import('@/app/api/stripe/checkout/route');
    mockGetBooking.mockReturnValueOnce(undefined);

    const req = makeRequest('http://localhost/api/stripe/checkout', { bookingId: 'nonexistent' });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('returns 400 when booking is not in pending status', async () => {
    const { POST } = await import('@/app/api/stripe/checkout/route');
    mockGetBooking.mockReturnValueOnce({
      id: 'booking-1',
      status: 'confirmed',
      total_usd: 100,
    });

    const req = makeRequest('http://localhost/api/stripe/checkout', { bookingId: 'booking-1' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('applies discount code and charges net_total_usd when code is valid', async () => {
    const mockFetch = jest.fn();
    global.fetch = mockFetch;

    const { POST } = await import('@/app/api/stripe/checkout/route');
    mockGetBooking.mockReturnValueOnce({
      id: 'b1',
      total_usd: 200,
      status: 'pending',
      listing_name: 'Posada Sol',
      guest_email: 'g@test.com',
      listing_slug: 'posada-sol',
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        valid: true,
        code_id: 'code-uuid',
        discount_amount_usd: 40,
        net_total_usd: 160,
      }),
    });

    const req = makeRequest('http://localhost/api/stripe/checkout', {
      bookingId: 'b1',
      discountCode: 'VZ20',
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ amountUsd: 160 })
    );
    expect(mockUpdateBookingStatus).toHaveBeenCalledWith(
      'b1',
      'pending',
      expect.objectContaining({
        discount_code_id: 'code-uuid',
        discount_amount_usd: 40,
      })
    );
  });

  it('falls back to full price when discount code is invalid', async () => {
    const mockFetch = jest.fn();
    global.fetch = mockFetch;

    const { POST } = await import('@/app/api/stripe/checkout/route');
    mockGetBooking.mockReturnValueOnce({
      id: 'b1',
      total_usd: 200,
      status: 'pending',
      listing_name: 'Posada Sol',
      guest_email: 'g@test.com',
      listing_slug: 'posada-sol',
    });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ valid: false }),
    });

    const req = makeRequest('http://localhost/api/stripe/checkout', {
      bookingId: 'b1',
      discountCode: 'BADC0DE',
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ amountUsd: 200 })
    );
  });
});

// ─── POST /api/stripe/webhooks ───────────────────────────────────────────────

describe('POST /api/stripe/webhooks', () => {
  it('rejects request with missing stripe-signature header', async () => {
    const { POST } = await import('@/app/api/stripe/webhooks/route');
    const req = new NextRequest('http://localhost/api/stripe/webhooks', {
      method: 'POST',
      body: '{}',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects invalid stripe signature', async () => {
    const { POST } = await import('@/app/api/stripe/webhooks/route');
    mockHandleWebhookEvent.mockRejectedValue(new Error('Invalid signature'));

    const req = new NextRequest('http://localhost/api/stripe/webhooks', {
      method: 'POST',
      body: '{}',
      headers: { 'stripe-signature': 'invalid-sig' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Invalid signature');
  });

  it('handles checkout.session.completed event', async () => {
    const { POST } = await import('@/app/api/stripe/webhooks/route');

    mockHandleWebhookEvent.mockResolvedValue({
      type: 'checkout.session.completed',
      data: { object: { metadata: { bookingId: 'booking-1' } } },
    });

    const q = buildQuery({ data: { id: 'booking-1' }, error: null });
    mockFrom.mockReturnValue(q);

    const req = new NextRequest('http://localhost/api/stripe/webhooks', {
      method: 'POST',
      body: '{}',
      headers: { 'stripe-signature': 'valid-sig' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  it('handles payment_intent.payment_failed event', async () => {
    const { POST } = await import('@/app/api/stripe/webhooks/route');

    mockHandleWebhookEvent.mockResolvedValue({
      type: 'payment_intent.payment_failed',
      data: { object: { metadata: { bookingId: 'booking-1' } } },
    });

    const q = buildQuery({ data: { id: 'booking-1' }, error: null });
    mockFrom.mockReturnValue(q);

    const req = new NextRequest('http://localhost/api/stripe/webhooks', {
      method: 'POST',
      body: '{}',
      headers: { 'stripe-signature': 'valid-sig' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
