/**
 * Mock Supabase client that returns configurable test data.
 */

type MockResponse = { data: unknown; error: unknown; count?: number | null };

let mockResponse: MockResponse = { data: null, error: null, count: null };

export function setMockResponse(response: MockResponse) {
  mockResponse = response;
}

export function resetMockResponse() {
  mockResponse = { data: null, error: null, count: null };
}

// Chainable query builder that resolves to mockResponse
function createQueryBuilder() {
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

  // Terminal methods return the mock response
  builder.single = jest.fn().mockImplementation(() => Promise.resolve(mockResponse));
  builder.maybeSingle = jest.fn().mockImplementation(() => Promise.resolve(mockResponse));

  // Make the builder itself a thenable so `await query` works
  (builder as unknown as PromiseLike<MockResponse>).then = (
    resolve: (v: MockResponse) => unknown,
    reject?: (e: unknown) => unknown
  ) => Promise.resolve(mockResponse).then(resolve, reject);

  return builder;
}

export const mockSupabaseClient = {
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  },
  from: jest.fn(() => createQueryBuilder()),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ data: { path: 'test/path.jpg' }, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test.jpg' } }),
    })),
  },
};

export function createMockSupabaseClient() {
  return {
    ...mockSupabaseClient,
    from: jest.fn(() => createQueryBuilder()),
  };
}
