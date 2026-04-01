/** @jest-environment node */
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/itineraries/route';
import { mockItinerary } from '@/__tests__/fixtures';

const mockFrom = jest.fn();
const mockAuth = { getUser: jest.fn() };

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({ auth: mockAuth, from: mockFrom })),
  createServiceClient: jest.fn(() => ({ auth: mockAuth, from: mockFrom })),
}));

function buildQuery(response: { data: unknown; error: unknown; count?: number | null }) {
  const q: Record<string, jest.Mock> = {};
  ['select', 'eq', 'order', 'range', 'limit'].forEach((m) => {
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

// ─── GET /api/itineraries ────────────────────────────────────────────────────

describe('GET /api/itineraries', () => {
  it('returns public itineraries when unauthenticated', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });
    const q = buildQuery({ data: [mockItinerary], error: null, count: 1 });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/itineraries');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(q.eq).toHaveBeenCalledWith('is_public', true);
  });

  it("returns user's itineraries with mine=true", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const q = buildQuery({ data: [mockItinerary], error: null, count: 1 });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/itineraries?mine=true');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(q.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });
});

// ─── POST /api/itineraries ───────────────────────────────────────────────────

describe('POST /api/itineraries', () => {
  const validItinerary = {
    title: 'My Venezuela Adventure',
    is_public: false,
    tags: [],
  };

  it('returns 401 when unauthenticated', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });
    const req = makeRequest('http://localhost/api/itineraries', {
      method: 'POST',
      body: JSON.stringify(validItinerary),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('creates an itinerary for authenticated user', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const q = buildQuery({ data: mockItinerary, error: null });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/itineraries', {
      method: 'POST',
      body: JSON.stringify(validItinerary),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data).toBeDefined();
  });

  it('returns 400 on invalid data (title too short)', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const req = makeRequest('http://localhost/api/itineraries', {
      method: 'POST',
      body: JSON.stringify({ title: 'AB', is_public: false, tags: [] }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ─── PATCH /api/itineraries/[id] ────────────────────────────────────────────

describe('PATCH /api/itineraries/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    const { PATCH } = await import('@/app/api/itineraries/[id]/route');
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });

    const req = makeRequest('http://localhost/api/itineraries/itinerary-uuid-1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Updated' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'itinerary-uuid-1' }) });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/itineraries/[id]', () => {
  it('returns a public itinerary for sharing', async () => {
    const { GET: GET_ID } = await import('@/app/api/itineraries/[id]/route');
    const q = buildQuery({ data: { ...mockItinerary, is_public: true }, error: null });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/itineraries/itinerary-uuid-1');
    const res = await GET_ID(req, { params: Promise.resolve({ id: 'itinerary-uuid-1' }) });
    expect(res.status).toBe(200);
  });
});
