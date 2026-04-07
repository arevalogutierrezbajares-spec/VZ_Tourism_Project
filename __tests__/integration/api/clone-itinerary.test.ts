/** @jest-environment node */
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/itineraries/[id]/clone/route';
import { mockItinerary, mockItineraryStop } from '@/__tests__/fixtures';

const mockFrom = jest.fn();
const mockAuth = { getUser: jest.fn() };

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({ auth: mockAuth, from: mockFrom })),
}));

function buildQuery(response: Record<string, unknown>) {
  const q: Record<string, jest.Mock> = {};
  ['select', 'eq', 'gte', 'single', 'insert', 'limit'].forEach((m) => {
    q[m] = jest.fn().mockReturnThis();
  });
  q.single = jest.fn().mockResolvedValue(response);
  q.insert = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue(response),
    }),
  });
  return q;
}

beforeEach(() => jest.clearAllMocks());

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/itineraries/[id]/clone', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });

    const req = new NextRequest('http://localhost/api/itineraries/test-id/clone', {
      method: 'POST',
    });

    const res = await POST(req, makeParams('test-id'));
    expect(res.status).toBe(401);
  });

  it('returns 404 for non-existent itinerary', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    // Rate limit check
    const rateLimitQuery = buildQuery({ data: null, error: null });
    Object.defineProperty(rateLimitQuery, 'count', { value: 0 });
    rateLimitQuery.select = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        gte: jest.fn().mockResolvedValue({ count: 0 }),
      }),
    });

    // Itinerary not found
    const itinQuery = buildQuery({ data: null, error: { message: 'not found' } });

    mockFrom
      .mockReturnValueOnce(rateLimitQuery)
      .mockReturnValueOnce(itinQuery);

    const req = new NextRequest('http://localhost/api/itineraries/nonexistent/clone', {
      method: 'POST',
    });

    const res = await POST(req, makeParams('nonexistent'));
    expect(res.status).toBe(404);
  });

  it('clones itinerary successfully', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const publicItinerary = {
      ...mockItinerary,
      is_public: true,
      stops: [mockItineraryStop],
    };

    // Rate limit check
    const rateLimitQuery: Record<string, jest.Mock> = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({ count: 0 }),
        }),
      }),
      from: jest.fn(),
    };

    // Fetch original
    const fetchQuery = buildQuery({ data: publicItinerary, error: null });

    // Insert clone
    const cloneResult = { id: 'cloned-uuid', ...publicItinerary };
    const insertQuery: Record<string, jest.Mock> = {
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: cloneResult, error: null }),
        }),
      }),
    };

    // Insert stops
    const stopsInsertQuery: Record<string, jest.Mock> = {
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    mockFrom
      .mockReturnValueOnce(rateLimitQuery)
      .mockReturnValueOnce(fetchQuery)
      .mockReturnValueOnce(insertQuery)
      .mockReturnValueOnce(stopsInsertQuery);

    const req = new NextRequest('http://localhost/api/itineraries/test-id/clone', {
      method: 'POST',
    });

    const res = await POST(req, makeParams('test-id'));
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.id).toBeDefined();
  });
});
