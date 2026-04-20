/**
 * PMS API client — calls through the VAV proxy at /api/pms/*
 * The proxy handles auth bridging (Supabase → PMS JWT).
 */

class PmsApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'PmsApiError';
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Pass PMS property context if stored
  const propertyId =
    typeof window !== 'undefined'
      ? localStorage.getItem('pms_property_id')
      : null;
  if (propertyId) {
    headers['X-PMS-Property-Id'] = propertyId;
  }

  const res = await fetch(`/api/pms/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    // PMS auth failed — clear cached token and redirect
    if (typeof window !== 'undefined') {
      window.location.href = '/login?redirectTo=/dashboard/pms';
    }
    throw new PmsApiError(401, 'Not authorized');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new PmsApiError(res.status, text);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const pmsApi = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

export { PmsApiError };
