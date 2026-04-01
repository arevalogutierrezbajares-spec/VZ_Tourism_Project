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
  it('returns 401 when unauthenticated', async () => {
    const { POST } = await import('@/app/api/stripe/checkout/route');
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });

    const req = makeRequest('http://localhost/api/stripe/checkout', { bookingId: 'booking-1' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when bookingId is missing', async () => {
    const { POST } = await import('@/app/api/stripe/checkout/route');
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const req = makeRequest('http://localhost/api/stripe/checkout', {});
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('bookingId');
  });

  it('creates a checkout session with correct amount', async () => {
    const { POST } = await import('@/app/api/stripe/checkout/route');
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@example.com' } } });

    const bookingData = {
      id: 'booking-1',
      total_usd: 170,
      status: 'pending',
      listing: { title: 'Mérida Trek', cover_image_url: null, slug: 'merida-trek' },
      tourist: { email: 'test@example.com' },
    };
    const q = buildQuery({ data: bookingData, error: null });
    mockFrom.mockReturnValue(q);

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
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const q = buildQuery({ data: null, error: null });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/stripe/checkout', { bookingId: 'nonexistent' });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('returns 400 when booking is not in pending status', async () => {
    const { POST } = await import('@/app/api/stripe/checkout/route');
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const q = buildQuery({ data: { id: 'booking-1', status: 'confirmed', total_usd: 100 }, error: null });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/stripe/checkout', { bookingId: 'booking-1' });
    const res = await POST(req);
    expect(res.status).toBe(400);
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
