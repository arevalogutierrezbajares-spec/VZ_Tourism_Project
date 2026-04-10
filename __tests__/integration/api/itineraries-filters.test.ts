/** @jest-environment node */
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/itineraries/route';
import { mockItinerary } from '@/__tests__/fixtures';

const mockFrom = jest.fn();
const mockAuth = { getUser: jest.fn() };

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({ auth: mockAuth, from: mockFrom })),
}));

function buildQuery(response: { data: unknown; error: unknown; count?: number | null }) {
  const q: Record<string, jest.Mock> = {};
  ['select', 'eq', 'gte', 'lte', 'contains', 'order', 'range', 'limit'].forEach((m) => {
    q[m] = jest.fn().mockReturnThis();
  });
  (q as unknown as { then: Function }).then = (resolve: Function) =>
    Promise.resolve(response).then(resolve as () => void);
  Object.defineProperty(q, 'data', { get: () => response.data });
  Object.defineProperty(q, 'error', { get: () => response.error });
  Object.defineProperty(q, 'count', { get: () => response.count });
  return q;
}

beforeEach(() => jest.clearAllMocks());

function makeRequest(url: string) {
  return new NextRequest(url);
}

describe('GET /api/itineraries with filters', () => {
  const publicItinerary = { ...mockItinerary, is_public: true, saves: 10, likes: 5 };

  beforeEach(() => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });
  });

  it('filters by region', async () => {
    const q = buildQuery({ data: [publicItinerary], error: null, count: 1 });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/itineraries?region=Mérida');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(q.contains).toHaveBeenCalledWith('regions', ['Mérida']);
  });

  it('filters by duration range', async () => {
    const q = buildQuery({ data: [publicItinerary], error: null, count: 1 });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/itineraries?duration_min=3&duration_max=5');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(q.gte).toHaveBeenCalledWith('total_days', 3);
    expect(q.lte).toHaveBeenCalledWith('total_days', 5);
  });

  it('filters by budget range', async () => {
    const q = buildQuery({ data: [publicItinerary], error: null, count: 1 });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/itineraries?budget_min=500&budget_max=1500');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(q.gte).toHaveBeenCalledWith('estimated_cost_usd', 500);
    expect(q.lte).toHaveBeenCalledWith('estimated_cost_usd', 1500);
  });

  it('sorts by newest', async () => {
    const q = buildQuery({ data: [publicItinerary], error: null, count: 1 });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/itineraries?sort=newest');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(q.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('sorts by price', async () => {
    const q = buildQuery({ data: [publicItinerary], error: null, count: 1 });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/itineraries?sort=price');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(q.order).toHaveBeenCalledWith('estimated_cost_usd', { ascending: true });
  });

  it('defaults to popular sort (saves descending)', async () => {
    const q = buildQuery({ data: [publicItinerary], error: null, count: 1 });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/itineraries');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(q.order).toHaveBeenCalledWith('saves', { ascending: false });
  });

  it('filters for influencer picks', async () => {
    const q = buildQuery({ data: [publicItinerary], error: null, count: 1 });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/itineraries?influencer_picks=true');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(q.eq).toHaveBeenCalledWith('is_influencer_pick', true);
  });

  it('computes recommendation_count on response', async () => {
    const q = buildQuery({ data: [{ ...publicItinerary, saves: 100, likes: 50 }], error: null, count: 1 });
    mockFrom.mockReturnValue(q);

    const req = makeRequest('http://localhost/api/itineraries');
    const res = await GET(req);
    const body = await res.json();

    expect(body.data[0].recommendation_count).toBe(150);
  });
});
