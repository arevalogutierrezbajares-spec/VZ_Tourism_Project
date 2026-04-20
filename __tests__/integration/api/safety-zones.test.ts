/** @jest-environment node */
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/safety-zones/route';
import { mockSafetyZones } from '@/__tests__/fixtures';

const mockFrom = jest.fn();
const mockAuth = { getUser: jest.fn() };

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({ auth: mockAuth, from: mockFrom })),
  createServiceClient: jest.fn(() => ({ auth: mockAuth, from: mockFrom })),
}));

function buildQuery(response: { data: unknown; error: unknown }) {
  const q: Record<string, jest.Mock> = {};
  ['select', 'eq', 'order'].forEach((m) => { q[m] = jest.fn().mockReturnThis(); });
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

// ─── GET /api/safety-zones ───────────────────────────────────────────────────

describe('GET /api/safety-zones', () => {
  it('returns all safety zones', async () => {
    const q = buildQuery({ data: mockSafetyZones, error: null });
    mockFrom.mockReturnValue(q);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toBeDefined();
  });

  it('returns 500 on database error', async () => {
    const q = buildQuery({ data: null, error: { message: 'DB error' } });
    mockFrom.mockReturnValue(q);

    const res = await GET();
    expect(res.status).toBe(500);
  });
});

// ─── POST /api/safety-zones ──────────────────────────────────────────────────

describe('POST /api/safety-zones', () => {
  const validZone = {
    name: 'Canaima',
    description: 'Angel Falls area',
    level: 'green',
    tips: ['Bring water'],
    polygon: null,
  };

  it('returns 401 when unauthenticated', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });

    const req = new NextRequest('http://localhost/api/safety-zones', {
      method: 'POST',
      body: JSON.stringify(validZone),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const q = buildQuery({ data: { role: 'tourist' }, error: null });
    mockFrom.mockReturnValue(q);

    const req = new NextRequest('http://localhost/api/safety-zones', {
      method: 'POST',
      body: JSON.stringify(validZone),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('creates a safety zone for admin users', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // user role lookup
        return buildQuery({ data: { role: 'admin' }, error: null });
      }
      // zone insert
      return buildQuery({ data: mockSafetyZones[0], error: null });
    });

    const req = new NextRequest('http://localhost/api/safety-zones', {
      method: 'POST',
      body: JSON.stringify(validZone),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it('returns 400 when required fields are missing', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
    const q = buildQuery({ data: { role: 'admin' }, error: null });
    mockFrom.mockReturnValue(q);

    const req = new NextRequest('http://localhost/api/safety-zones', {
      method: 'POST',
      body: JSON.stringify({ name: 'Zone' }), // missing description and level
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
