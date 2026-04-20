import { NextResponse } from 'next/server';

// TODO: Replace with @upstash/ratelimit for production — current Map resets on cold start
// (serverless cold starts wipe all module-level state, effectively removing rate limits).
// Fix: `import { Ratelimit } from '@upstash/ratelimit'; import { Redis } from '@upstash/redis';`
// then `new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, '60 s') })`

// Simple in-memory rate limiter using a sliding window.
// WARNING: This implementation provides no protection in production serverless environments
// because the Map is lost on every cold start. Use only as a development convenience.
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
