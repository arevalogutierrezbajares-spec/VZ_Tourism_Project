import { NextResponse } from 'next/server';

// Simple in-memory rate limiter using a sliding window
const requests = new Map<string, number[]>();

const WINDOW_MS = 60_000; // 1 minute
const CLEANUP_INTERVAL = 5 * 60_000; // 5 minutes

// Periodic cleanup to prevent memory leak
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of requests) {
      const valid = timestamps.filter((t) => now - t < WINDOW_MS);
      if (valid.length === 0) requests.delete(key);
      else requests.set(key, valid);
    }
  }, CLEANUP_INTERVAL);
}

/**
 * Rate limit by IP address. Returns null if allowed, or a 429 NextResponse if rate limited.
 * @param identifier - typically the IP address or user ID
 * @param maxRequests - max requests per window (default: 10 per minute)
 */
export function rateLimit(identifier: string, maxRequests = 10): NextResponse | null {
  const now = Date.now();
  const timestamps = requests.get(identifier) ?? [];
  const valid = timestamps.filter((t) => now - t < WINDOW_MS);

  if (valid.length >= maxRequests) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  valid.push(now);
  requests.set(identifier, valid);
  return null;
}

/** Extract client IP from request headers */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}
