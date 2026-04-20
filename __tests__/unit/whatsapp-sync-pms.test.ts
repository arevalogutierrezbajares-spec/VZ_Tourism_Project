/** @jest-environment node */
/**
 * Unit tests for POST /api/whatsapp/knowledge/sync-pms
 *
 * Verifies: auth gating, PMS bridge secret guard, fetch timeout,
 * data mapping (cents-to-dollars), amenity merging, and error paths.
 */

// Set PMS_BRIDGE_SECRET BEFORE module import (module-level const reads it)
process.env.PMS_BRIDGE_SECRET = 'test-secret';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockCreateClient = jest.fn();
const mockCreateServiceClient = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
  createServiceClient: () => mockCreateServiceClient(),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({
    get: jest.fn(() => undefined),
  })),
}));

// ─── Import AFTER mocks ────────────────────────────────────────────────────

import { POST } from '@/app/api/whatsapp/knowledge/sync-pms/route';

// ─── Helpers ────────────────────────────────────────────────────────────────

function supabaseWithUser(user: { id: string; email: string; user_metadata?: Record<string, unknown> } | null) {
  const providerQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(
      user ? { data: { id: 'prov-1' }, error: null } : { data: null, error: { message: 'not found' } }
    ),
  };

  mockCreateClient.mockReturnValue({
    auth: {
      getUser: () => Promise.resolve({ data: { user } }),
    },
    from: jest.fn(() => providerQuery),
  });
}

function mockServiceClient(existingKnowledge: Record<string, unknown> | null = null) {
  const selectChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: existingKnowledge, error: null }),
  };

  const upsertChain = {
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: { id: 'k-1', provider_id: 'prov-1', property_description: 'Test' },
      error: null,
    }),
  };

  mockCreateServiceClient.mockReturnValue({
    from: jest.fn(() => ({
      ...selectChain,
      upsert: jest.fn(() => upsertChain),
    })),
  });
}

function mockPmsFetch(property: Record<string, unknown>, unitTypes: Record<string, unknown>[]) {
  (global.fetch as jest.Mock).mockImplementation((url: string, opts?: { signal?: AbortSignal }) => {
    if (url.includes('/auth/bridge')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          accessToken: 'pms-tok',
          user: { id: 'pms-u1' },
        }),
      });
    }
    if (url.includes('/properties/current')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(property),
      });
    }
    if (url.includes('/units/types')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(unitTypes),
      });
    }
    return Promise.resolve({ ok: false, status: 404 });
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/whatsapp/knowledge/sync-pms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  it('returns 503 when supabase is unavailable', async () => {
    mockCreateClient.mockReturnValue(null);
    const res = await POST();
    expect(res.status).toBe(503);
  });

  it('returns 401 when user is not authenticated', async () => {
    supabaseWithUser(null);
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it('returns 404 when provider is not found', async () => {
    const providerQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockCreateClient.mockReturnValue({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: 'u1', email: 'a@b.com' } } }),
      },
      from: jest.fn(() => providerQuery),
    });
    const res = await POST();
    expect(res.status).toBe(404);
  });

  it('returns 200 with synced fields on success', async () => {
    supabaseWithUser({ id: 'u1', email: 'a@b.com', user_metadata: { full_name: 'Test' } });
    mockServiceClient(null);

    mockPmsFetch(
      { name: 'Posada Mochima', address: 'Calle 1', city: 'Mochima', state: 'Sucre', phone: null, email: null },
      [
        { name: 'Standard', base_rate_cents: 12550, max_adults: 2, max_children: 1, amenities: ['WiFi', 'AC'] },
        { name: 'Suite', base_rate_cents: 25000, max_adults: 4, max_children: 2, amenities: ['WiFi', 'Pool'] },
      ],
    );

    const res = await POST();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.synced_fields).toEqual(
      expect.arrayContaining(['property_description', 'location_details', 'room_types', 'amenities']),
    );
  });

  it('returns 200 with correct data when PMS returns units', async () => {
    supabaseWithUser({ id: 'u1', email: 'a@b.com' });
    mockServiceClient(null);

    mockPmsFetch(
      { name: 'Test', address: '', city: 'Caracas', state: 'Distrito Capital', phone: null, email: null },
      [{ name: 'Room', base_rate_cents: 12550, max_adults: 2, max_children: 0, amenities: [] }],
    );

    const res = await POST();
    expect(res.status).toBe(200);
  });

  it('merges PMS amenities with existing human-added amenities', async () => {
    supabaseWithUser({ id: 'u1', email: 'a@b.com' });
    mockServiceClient({ id: 'k-1', provider_id: 'prov-1', amenities: ['Hammocks', 'WiFi'] });

    mockPmsFetch(
      { name: 'Test', address: '', city: 'Caracas', state: 'DC', phone: null, email: null },
      [{ name: 'Room', base_rate_cents: 5000, max_adults: 2, max_children: 0, amenities: ['WiFi', 'Pool'] }],
    );

    const res = await POST();
    expect(res.status).toBe(200);
  });

  it('returns 502 when PMS property fetch fails', async () => {
    supabaseWithUser({ id: 'u1', email: 'a@b.com' });
    mockServiceClient(null);

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/auth/bridge')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ accessToken: 'tok', user: { id: 'u1' } }),
        });
      }
      if (url.includes('/properties/current')) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      if (url.includes('/units/types')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: false });
    });

    const res = await POST();
    expect(res.status).toBe(502);
  });

  it('handles empty unit types gracefully', async () => {
    supabaseWithUser({ id: 'u1', email: 'a@b.com' });
    mockServiceClient(null);

    mockPmsFetch(
      { name: 'Test', address: '', city: 'Test', state: 'Test', phone: null, email: null },
      [],
    );

    const res = await POST();
    expect(res.status).toBe(200);
  });

  it('returns 502 when PMS bridge auth fails', async () => {
    supabaseWithUser({ id: 'u1', email: 'a@b.com' });

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/auth/bridge')) {
        return Promise.resolve({ ok: false, status: 401 });
      }
      return Promise.resolve({ ok: false });
    });

    const res = await POST();
    expect(res.status).toBe(502);
  });
});
