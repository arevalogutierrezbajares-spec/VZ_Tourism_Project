/** @jest-environment node */
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/listings/route';
import { mockListings, mockListing } from '@/__tests__/fixtures';

// ─── Mock Supabase ────────────────────────────────────────────────────────────

const mockFrom = jest.fn();
const mockAuth = {
  getUser: jest.fn(),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: mockAuth,
    from: mockFrom,
  })),
  createServiceClient: jest.fn(() => ({
    auth: mockAuth,
    from: mockFrom,
  })),
}));

// Build a chainable query builder
function buildQuery(response: { data: unknown; error: unknown; count?: number | null }) {
  const q: Record<string, jest.Mock> = {};
  const chainable = ['select', 'eq', 'in', 'ilike', 'gte', 'lte', 'order', 'range', 'limit', 'overlaps', 'update', 'delete'];
  chainable.forEach((m) => { q[m] = jest.fn().mockReturnThis(); });
  q.insert = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({ data: response.data, error: response.error }),
    }),
  });
  q.single = jest.fn().mockResolvedValue(response);
  // thenable for .range() result
  (q as unknown as { then: Function }).then = (resolve: Function) =>
    Promise.resolve(response).then(resolve as () => void);
  return q;
}

beforeEach(() => {
  jest.clearAllMocks();
});

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(url, init);
}

// ─── GET /api/listings ───────────────────────────────────────────────────────

describe('GET /api/listings', () => {
  it('returns listings with pagination', async () => {
    const q = buildQuery({ data: mockListings, error: null, count: 2 });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/listings');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    // Route maps raw Supabase rows through mapSupabaseToApiListing() — shape differs from fixtures
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data).toHaveLength(2);
    expect(json.data[0].id).toBe(mockListings[0].id);
    expect(json.count).toBe(2);
  });

  it('applies category filter when provided', async () => {
    const q = buildQuery({ data: [mockListing], error: null, count: 1 });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/listings?category=mountains');
    await GET(req);

    expect(q.eq).toHaveBeenCalledWith('category', 'mountains');
  });

  it('applies region filter when provided', async () => {
    const q = buildQuery({ data: [mockListing], error: null, count: 1 });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/listings?region=M%C3%A9rida');
    await GET(req);

    expect(q.eq).toHaveBeenCalledWith('region', 'Mérida');
  });

  it('applies min_price filter', async () => {
    const q = buildQuery({ data: mockListings, error: null, count: 2 });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/listings?min_price=50');
    await GET(req);

    expect(q.gte).toHaveBeenCalledWith('price_usd', 50);
  });

  it('applies max_price filter', async () => {
    const q = buildQuery({ data: mockListings, error: null, count: 2 });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/listings?max_price=200');
    await GET(req);

    expect(q.lte).toHaveBeenCalledWith('price_usd', 200);
  });

  it('falls back to local JSON data when Supabase errors', async () => {
    // Route silently falls back to local listing JSON on DB error (resilient degradation)
    const q = buildQuery({ data: null, error: { message: 'DB error' } });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/listings');
    const res = await GET(req);

    // Fallback returns 200 with local data instead of 500
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
  });
});

// ─── POST /api/listings ──────────────────────────────────────────────────────

describe('POST /api/listings', () => {
  const validListingBody = {
    title: 'Mérida Mountain Trek Adventure',
    description: 'A beautiful trek through the Venezuelan Andes mountains with expert guides providing equipment and local knowledge. This experience is perfect for adventure seekers.',
    short_description: 'Trek through the Venezuelan Andes with local guides.',
    category: 'mountains',
    tags: ['hiking'],
    region: 'Mérida',
    location_name: 'Sierra Nevada',
    latitude: 8.6,
    longitude: -71.15,
    price_usd: 85,
    max_guests: 10,
    min_guests: 2,
    safety_level: 'green',
    amenities: [],
    languages: ['es'],
    includes: [],
    excludes: [],
    cancellation_policy: 'moderate',
  };

  it('rejects unauthenticated requests', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });

    const req = makeRequest('http://localhost/api/listings', {
      method: 'POST',
      body: JSON.stringify(validListingBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('rejects non-provider users (no provider record)', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const q = buildQuery({ data: null, error: null });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/listings', {
      method: 'POST',
      body: JSON.stringify(validListingBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('creates a listing for authenticated provider', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // providers query
        return buildQuery({ data: { id: 'provider-1' }, error: null });
      }
      // listings insert
      return {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockListing, error: null }),
          }),
        }),
      };
    });

    const req = makeRequest('http://localhost/api/listings', {
      method: 'POST',
      body: JSON.stringify(validListingBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data).toBeDefined();
  });

  it('returns 400 on invalid payload', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const q = buildQuery({ data: { id: 'provider-1' }, error: null });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/listings', {
      method: 'POST',
      body: JSON.stringify({ title: 'Too short', price_usd: -1 }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ─── GET/PATCH /api/listings/[id] ───────────────────────────────────────────

describe('GET /api/listings/[id]', () => {
  it('returns a single listing with reviews', async () => {
    const { GET: GET_ID } = await import('@/app/api/listings/[id]/route');

    const q = buildQuery({ data: mockListing, error: null });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/listings/listing-uuid-1');
    const res = await GET_ID(req, { params: Promise.resolve({ id: 'listing-uuid-1' }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toBeDefined();
  });

  it('returns 404 when listing not found', async () => {
    const { GET: GET_ID } = await import('@/app/api/listings/[id]/route');

    const q = buildQuery({ data: null, error: { message: 'not found' } });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/listings/nonexistent');
    const res = await GET_ID(req, { params: Promise.resolve({ id: 'nonexistent' }) });

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/listings/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    const { PATCH } = await import('@/app/api/listings/[id]/route');
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });

    const req = makeRequest('http://localhost/api/listings/listing-uuid-1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Updated Title' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'listing-uuid-1' }) });
    expect(res.status).toBe(401);
  });
});
