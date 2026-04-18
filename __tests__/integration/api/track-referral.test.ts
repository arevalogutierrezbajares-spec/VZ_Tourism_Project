/** @jest-environment node */
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/itineraries/[id]/track-referral/route';

const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
  })),
}));

function buildQuery(response: Record<string, unknown>) {
  const q: Record<string, jest.Mock> = {};
  ['select', 'eq', 'single', 'insert', 'update'].forEach((m) => {
    q[m] = jest.fn().mockReturnThis();
  });
  q.single = jest.fn().mockResolvedValue(response);
  q.insert = jest.fn().mockResolvedValue({ data: null, error: null });
  q.update = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: null, error: null }) });
  return q;
}

beforeEach(() => jest.clearAllMocks());

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/itineraries/[id]/track-referral', () => {
  it('returns 400 when referral_code is missing', async () => {
    const req = new NextRequest('http://localhost/api/itineraries/test-id/track-referral', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req, makeParams('test-id'));
    expect(res.status).toBe(400);
  });

  it('returns 404 for invalid itinerary or referral code', async () => {
    const q = buildQuery({ data: null, error: null });
    mockFrom.mockReturnValue(q);

    const req = new NextRequest('http://localhost/api/itineraries/test-id/track-referral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referral_code: 'invalid-code' }),
    });

    const res = await POST(req, makeParams('test-id'));
    expect(res.status).toBe(404);
  });

  it('tracks referral successfully', async () => {
    // First call: check itinerary exists
    const itineraryQuery = buildQuery({
      data: { id: 'test-id', referral_code: 'test-code', user_id: 'creator-user-id' },
      error: null,
    });
    // Second call: get creator profile
    const creatorQuery = buildQuery({
      data: { id: 'creator-profile-id' },
      error: null,
    });
    // Third call: insert referral
    const insertQuery = buildQuery({ data: null, error: null });
    // Fourth call: update views
    const updateQuery = buildQuery({ data: null, error: null });

    mockFrom
      .mockReturnValueOnce(itineraryQuery)
      .mockReturnValueOnce(creatorQuery)
      .mockReturnValueOnce(insertQuery)
      .mockReturnValueOnce(updateQuery);

    // Supabase clients return { error } objects, not thrown rejections
    mockRpc.mockResolvedValue({ error: { message: 'no rpc' } });

    const req = new NextRequest('http://localhost/api/itineraries/test-id/track-referral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referral_code: 'test-code' }),
    });

    const res = await POST(req, makeParams('test-id'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.tracked).toBe(true);
  });
});
