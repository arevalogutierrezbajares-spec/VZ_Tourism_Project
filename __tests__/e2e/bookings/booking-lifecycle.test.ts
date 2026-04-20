/** @jest-environment node */
import { NextRequest } from 'next/server';

// ─── Mock Setup ────────────────────────────────────────────────────────────

const mockGetUser = jest.fn();
const mockFromChain = jest.fn();

// Build a reusable chainable Supabase query builder
function createChainableBuilder(terminalData: { data: unknown; error: unknown } | null = null) {
  const builder: Record<string, jest.Mock> = {};
  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'in', 'not', 'ilike', 'like',
    'gte', 'lte', 'gt', 'lt',
    'order', 'range', 'limit', 'overlaps',
  ];
  chainMethods.forEach((method) => {
    builder[method] = jest.fn().mockReturnThis();
  });
  builder.single = jest.fn().mockImplementation(() =>
    Promise.resolve(terminalData ?? { data: null, error: null })
  );
  builder.maybeSingle = jest.fn().mockImplementation(() =>
    Promise.resolve(terminalData ?? { data: null, error: null })
  );
  // Make builder thenable
  (builder as unknown as PromiseLike<unknown>).then = (
    resolve: (v: unknown) => unknown,
    reject?: (e: unknown) => unknown
  ) => Promise.resolve(terminalData ?? { data: [], error: null }).then(resolve, reject);

  return builder;
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFromChain,
  })),
  createServiceClient: jest.fn(async () => null),
}));

jest.mock('@/lib/stripe/server', () => ({
  stripe: {
    checkout: { sessions: { retrieve: jest.fn() } },
    refunds: { create: jest.fn() },
  },
  createCheckoutSession: jest.fn().mockResolvedValue({
    id: 'cs_test_123',
    url: 'https://checkout.stripe.com/pay/cs_test_123',
  }),
  handleWebhookEvent: jest.fn(),
}));

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn().mockResolvedValue({ id: 'email-1' }) },
  })),
}));

// ─── Import route handlers AFTER mocks ─────────────────────────────────────

import { GET as getBookings, POST as postBooking } from '@/app/api/bookings/route';
import { GET as getBookingById, PATCH as patchBooking } from '@/app/api/bookings/[id]/route';
import { GET as getMyBookings } from '@/app/api/bookings/mine/route';

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(url, init);
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

const TEST_USER = { id: 'user-123', email: 'maria@example.com' };
const OTHER_USER = { id: 'user-999', email: 'other@example.com' };

const VALID_BOOKING_PAYLOAD = {
  listing_id: 'test-listing-id',
  check_in: '2026-06-15',
  guest_name: 'Maria Garcia',
  guest_email: 'maria@example.com',
  payment_method: 'arrival' as const,
};

// ─── Setup / Teardown ──────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  // Default: authenticated as TEST_USER
  mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });

  // Default: Supabase from() returns empty chainable builder
  // (routes fall through to JSON store fallback)
  mockFromChain.mockImplementation(() => createChainableBuilder());
});

// ─── GET /api/bookings — Auth Guards ───────────────────────────────────────

describe('GET /api/bookings — auth guards', () => {
  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const req = makeRequest('http://localhost/api/bookings');
    const res = await getBookings(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 200 with data array when authenticated', async () => {
    const req = makeRequest('http://localhost/api/bookings');
    const res = await getBookings(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
  });

  it('returns empty data when user has no email', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123', email: null } } });
    const req = makeRequest('http://localhost/api/bookings');
    const res = await getBookings(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual([]);
  });
});

// ─── GET /api/bookings — Status Filter ─────────────────────────────────────

describe('GET /api/bookings — filtering', () => {
  it('accepts status query parameter', async () => {
    const req = makeRequest('http://localhost/api/bookings?status=confirmed');
    const res = await getBookings(req);
    expect(res.status).toBe(200);
  });

  it('returns data array even with status filter', async () => {
    const req = makeRequest('http://localhost/api/bookings?status=pending');
    const res = await getBookings(req);
    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
  });
});

// ─── POST /api/bookings — Validation ───────────────────────────────────────

describe('POST /api/bookings — validation', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const req = makeRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify(VALID_BOOKING_PAYLOAD),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await postBooking(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when body is not valid JSON', async () => {
    const req = makeRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await postBooking(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when required fields are missing', async () => {
    const req = makeRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ listing_id: 'x' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await postBooking(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when guest_name is missing', async () => {
    const req = makeRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        listing_id: 'test-id',
        check_in: '2026-06-15',
        guest_email: 'maria@example.com',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await postBooking(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when guest_email is invalid', async () => {
    const req = makeRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        listing_id: 'test-id',
        check_in: '2026-06-15',
        guest_name: 'Maria',
        guest_email: 'not-an-email',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await postBooking(req);
    expect(res.status).toBe(400);
  });

  it('returns 422 when listing has no pricing', async () => {
    const req = makeRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify(VALID_BOOKING_PAYLOAD),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await postBooking(req);
    // Listing not found in scraped-listings.json => no pricing => 422
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toContain('pricing');
  });
});

// ─── GET /api/bookings/mine — Auth ─────────────────────────────────────────

describe('GET /api/bookings/mine', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await getMyBookings();
    expect(res.status).toBe(401);
  });

  it('returns bookings array when authenticated', async () => {
    // Mock supabase from().select()... returning empty
    mockFromChain.mockImplementation(() => {
      const builder = createChainableBuilder();
      // Override the thenable to return array data
      (builder as unknown as PromiseLike<unknown>).then = (
        resolve: (v: unknown) => unknown,
        reject?: (e: unknown) => unknown
      ) => Promise.resolve({ data: [], error: null }).then(resolve, reject);
      return builder;
    });
    const res = await getMyBookings();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.bookings)).toBe(true);
  });

  it('returns empty bookings when user has no email', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } } });
    const res = await getMyBookings();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.bookings).toEqual([]);
  });
});

// ─── GET /api/bookings/:id — Auth & Ownership ─────────────────────────────

describe('GET /api/bookings/:id — auth and ownership', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const req = makeRequest('http://localhost/api/bookings/booking-1');
    const res = await getBookingById(req, makeParams('booking-1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when booking does not exist', async () => {
    // Supabase returns not found, JSON store also empty
    mockFromChain.mockImplementation(() =>
      createChainableBuilder({ data: null, error: { code: 'PGRST116', message: 'Not found' } })
    );
    const req = makeRequest('http://localhost/api/bookings/nonexistent');
    const res = await getBookingById(req, makeParams('nonexistent'));
    expect(res.status).toBe(404);
  });

  it('returns 401 when booking belongs to another user (ownership check)', async () => {
    // Supabase returns a booking with a different email
    mockFromChain.mockImplementation(() =>
      createChainableBuilder({
        data: {
          id: 'booking-1',
          guest_email: 'other@example.com',
          listing_id: 'listing-1',
        },
        error: null,
      })
    );
    const req = makeRequest('http://localhost/api/bookings/booking-1');
    const res = await getBookingById(req, makeParams('booking-1'));
    expect(res.status).toBe(401);
  });

  it('returns booking data when user owns it', async () => {
    const bookingData = {
      id: 'booking-1',
      guest_email: 'maria@example.com',
      listing_id: 'listing-1',
      listing_slug: 'merida-trek',
      status: 'confirmed',
      total_usd: 170,
    };
    mockFromChain.mockImplementation(() =>
      createChainableBuilder({ data: bookingData, error: null })
    );
    const req = makeRequest('http://localhost/api/bookings/booking-1');
    const res = await getBookingById(req, makeParams('booking-1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe('booking-1');
    expect(json.data.status).toBe('confirmed');
  });
});

// ─── PATCH /api/bookings/:id — Update Status ──────────────────────────────

describe('PATCH /api/bookings/:id — update status', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const req = makeRequest('http://localhost/api/bookings/booking-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'cancelled' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await patchBooking(req, makeParams('booking-1'));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = makeRequest('http://localhost/api/bookings/booking-1', {
      method: 'PATCH',
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await patchBooking(req, makeParams('booking-1'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid status value', async () => {
    // First, set up supabase to return a valid booking for ownership check
    // and then the profiles query
    let callCount = 0;
    mockFromChain.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return createChainableBuilder({ data: { role: 'tourist' }, error: null });
      }
      if (table === 'guest_bookings') {
        callCount++;
        if (callCount === 1) {
          // First call: ownership check (select)
          return createChainableBuilder({
            data: {
              guest_email: 'maria@example.com',
              listing_id: 'listing-1',
              status: 'confirmed',
            },
            error: null,
          });
        }
        // Second call: the update
        return createChainableBuilder({ data: null, error: null });
      }
      return createChainableBuilder();
    });

    const req = makeRequest('http://localhost/api/bookings/booking-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'invalid_status' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await patchBooking(req, makeParams('booking-1'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid status');
  });

  it('returns 404 when booking does not exist', async () => {
    let callCount = 0;
    mockFromChain.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return createChainableBuilder({ data: { role: 'tourist' }, error: null });
      }
      if (table === 'guest_bookings') {
        callCount++;
        if (callCount === 1) {
          // Ownership check: not found
          return createChainableBuilder({
            data: null,
            error: { code: 'PGRST116', message: 'Not found' },
          });
        }
      }
      return createChainableBuilder();
    });

    const req = makeRequest('http://localhost/api/bookings/nonexistent', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'cancelled' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await patchBooking(req, makeParams('nonexistent'));
    expect(res.status).toBe(404);
  });

  it('returns 401 when trying to update another user booking', async () => {
    let callCount = 0;
    mockFromChain.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return createChainableBuilder({ data: { role: 'tourist' }, error: null });
      }
      if (table === 'guest_bookings') {
        callCount++;
        if (callCount === 1) {
          // Ownership check: booking belongs to another user
          return createChainableBuilder({
            data: {
              guest_email: 'other@example.com',
              listing_id: 'listing-1',
              status: 'confirmed',
            },
            error: null,
          });
        }
      }
      return createChainableBuilder();
    });

    const req = makeRequest('http://localhost/api/bookings/booking-other', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'cancelled' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await patchBooking(req, makeParams('booking-other'));
    expect(res.status).toBe(401);
  });

  it('successfully updates booking status to cancelled', async () => {
    const updatedBooking = {
      id: 'booking-1',
      guest_email: 'maria@example.com',
      listing_id: 'listing-1',
      status: 'cancelled',
      total_usd: 170,
    };

    let callCount = 0;
    mockFromChain.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return createChainableBuilder({ data: { role: 'tourist' }, error: null });
      }
      if (table === 'guest_bookings') {
        callCount++;
        if (callCount === 1) {
          // Ownership check
          return createChainableBuilder({
            data: {
              guest_email: 'maria@example.com',
              listing_id: 'listing-1',
              status: 'confirmed',
            },
            error: null,
          });
        }
        if (callCount === 2) {
          // Update call
          return createChainableBuilder({ data: updatedBooking, error: null });
        }
      }
      return createChainableBuilder();
    });

    const req = makeRequest('http://localhost/api/bookings/booking-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'cancelled' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await patchBooking(req, makeParams('booking-1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe('cancelled');
  });

  it('successfully updates booking status to confirmed', async () => {
    const updatedBooking = {
      id: 'booking-1',
      guest_email: 'maria@example.com',
      listing_id: 'listing-1',
      status: 'confirmed',
    };

    let callCount = 0;
    mockFromChain.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return createChainableBuilder({ data: { role: 'tourist' }, error: null });
      }
      if (table === 'guest_bookings') {
        callCount++;
        if (callCount === 1) {
          return createChainableBuilder({
            data: {
              guest_email: 'maria@example.com',
              listing_id: 'listing-1',
              status: 'pending',
            },
            error: null,
          });
        }
        if (callCount === 2) {
          return createChainableBuilder({ data: updatedBooking, error: null });
        }
      }
      return createChainableBuilder();
    });

    const req = makeRequest('http://localhost/api/bookings/booking-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'confirmed' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await patchBooking(req, makeParams('booking-1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe('confirmed');
  });

  it('updates notes and special_requests alongside status', async () => {
    const updatedBooking = {
      id: 'booking-1',
      guest_email: 'maria@example.com',
      listing_id: 'listing-1',
      status: 'confirmed',
      notes: 'Updated note',
      special_requests: 'Vegan meals',
    };

    let callCount = 0;
    mockFromChain.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return createChainableBuilder({ data: { role: 'tourist' }, error: null });
      }
      if (table === 'guest_bookings') {
        callCount++;
        if (callCount === 1) {
          return createChainableBuilder({
            data: {
              guest_email: 'maria@example.com',
              listing_id: 'listing-1',
              status: 'pending',
            },
            error: null,
          });
        }
        if (callCount === 2) {
          return createChainableBuilder({ data: updatedBooking, error: null });
        }
      }
      return createChainableBuilder();
    });

    const req = makeRequest('http://localhost/api/bookings/booking-1', {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'confirmed',
        notes: 'Updated note',
        special_requests: 'Vegan meals',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await patchBooking(req, makeParams('booking-1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.notes).toBe('Updated note');
    expect(json.data.special_requests).toBe('Vegan meals');
  });
});

// ─── Full Lifecycle ────────────────────────────────────────────────────────

describe('Booking lifecycle — full flow', () => {
  it('POST returns 422 for non-existent listing, confirming validation pipeline', async () => {
    // Step 1: Create booking attempt
    const req = makeRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify(VALID_BOOKING_PAYLOAD),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await postBooking(req);
    // Since listing is not in scraped-listings.json, we get 422
    expect(res.status).toBe(422);
  });

  it('GET list returns consistent data format with count', async () => {
    const req = makeRequest('http://localhost/api/bookings');
    const res = await getBookings(req);
    const json = await res.json();
    expect(json).toHaveProperty('data');
    expect(json).toHaveProperty('count');
    expect(typeof json.count).toBe('number');
  });

  it('PATCH validates all accepted statuses', async () => {
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'payment_submitted'];

    for (const status of validStatuses) {
      let callCount = 0;
      mockFromChain.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return createChainableBuilder({ data: { role: 'tourist' }, error: null });
        }
        if (table === 'guest_bookings') {
          callCount++;
          if (callCount === 1) {
            return createChainableBuilder({
              data: {
                guest_email: 'maria@example.com',
                listing_id: 'listing-1',
                status: 'pending',
              },
              error: null,
            });
          }
          return createChainableBuilder({
            data: { id: 'b-1', status, guest_email: 'maria@example.com' },
            error: null,
          });
        }
        return createChainableBuilder();
      });

      const req = makeRequest('http://localhost/api/bookings/b-1', {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await patchBooking(req, makeParams('b-1'));
      expect(res.status).toBe(200);
    }
  });

  it('Retrieve → Update → Retrieve shows consistent state', async () => {
    // Step 1: GET the booking (confirmed)
    mockFromChain.mockImplementation(() =>
      createChainableBuilder({
        data: {
          id: 'lifecycle-1',
          guest_email: 'maria@example.com',
          listing_id: 'listing-1',
          listing_slug: null,
          status: 'confirmed',
          total_usd: 200,
        },
        error: null,
      })
    );

    const getReq = makeRequest('http://localhost/api/bookings/lifecycle-1');
    const getRes = await getBookingById(getReq, makeParams('lifecycle-1'));
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json();
    expect(getJson.data.status).toBe('confirmed');

    // Step 2: PATCH to cancelled
    let patchCallCount = 0;
    mockFromChain.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return createChainableBuilder({ data: { role: 'tourist' }, error: null });
      }
      if (table === 'guest_bookings') {
        patchCallCount++;
        if (patchCallCount === 1) {
          return createChainableBuilder({
            data: {
              guest_email: 'maria@example.com',
              listing_id: 'listing-1',
              status: 'confirmed',
            },
            error: null,
          });
        }
        return createChainableBuilder({
          data: {
            id: 'lifecycle-1',
            guest_email: 'maria@example.com',
            status: 'cancelled',
          },
          error: null,
        });
      }
      return createChainableBuilder();
    });

    const patchReq = makeRequest('http://localhost/api/bookings/lifecycle-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'cancelled' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const patchRes = await patchBooking(patchReq, makeParams('lifecycle-1'));
    expect(patchRes.status).toBe(200);
    const patchJson = await patchRes.json();
    expect(patchJson.data.status).toBe('cancelled');

    // Step 3: GET again — now cancelled
    mockFromChain.mockImplementation(() =>
      createChainableBuilder({
        data: {
          id: 'lifecycle-1',
          guest_email: 'maria@example.com',
          listing_id: 'listing-1',
          listing_slug: null,
          status: 'cancelled',
          total_usd: 200,
        },
        error: null,
      })
    );

    const getReq2 = makeRequest('http://localhost/api/bookings/lifecycle-1');
    const getRes2 = await getBookingById(getReq2, makeParams('lifecycle-1'));
    expect(getRes2.status).toBe(200);
    const getJson2 = await getRes2.json();
    expect(getJson2.data.status).toBe('cancelled');
  });
});

// ─── Edge Cases ────────────────────────────────────────────────────────────

describe('Booking API — edge cases', () => {
  it('GET /api/bookings handles Supabase error gracefully (falls to JSON store)', async () => {
    // Make Supabase throw, it should still fall back
    mockFromChain.mockImplementation(() => {
      const builder = createChainableBuilder();
      (builder as unknown as PromiseLike<unknown>).then = (
        resolve: (v: unknown) => unknown,
        reject?: (e: unknown) => unknown
      ) => Promise.resolve({ data: null, error: { message: 'Connection refused' } }).then(resolve, reject);
      return builder;
    });

    const req = makeRequest('http://localhost/api/bookings');
    const res = await getBookings(req);
    // Should still return 200 from JSON fallback
    expect(res.status).toBe(200);
  });

  it('POST /api/bookings rejects payment_method not in enum', async () => {
    const req = makeRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        ...VALID_BOOKING_PAYLOAD,
        payment_method: 'bitcoin',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await postBooking(req);
    expect(res.status).toBe(400);
  });

  it('PATCH /api/bookings/:id with empty body still returns success if booking exists', async () => {
    let callCount = 0;
    mockFromChain.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return createChainableBuilder({ data: { role: 'tourist' }, error: null });
      }
      if (table === 'guest_bookings') {
        callCount++;
        if (callCount === 1) {
          return createChainableBuilder({
            data: {
              guest_email: 'maria@example.com',
              listing_id: 'listing-1',
              status: 'pending',
            },
            error: null,
          });
        }
        return createChainableBuilder({
          data: { id: 'b-1', status: 'pending', guest_email: 'maria@example.com' },
          error: null,
        });
      }
      return createChainableBuilder();
    });

    const req = makeRequest('http://localhost/api/bookings/b-1', {
      method: 'PATCH',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await patchBooking(req, makeParams('b-1'));
    expect(res.status).toBe(200);
  });
});
