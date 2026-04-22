import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

// Fallback for dev without Redis configured
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? Redis.fromEnv()
  : null;

// Default: 10 req / 60s (for authenticated endpoints)
const defaultLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      analytics: true,
      prefix: 'rl',
    })
  : null;

// Webhook: 20 messages / 60s per phone number
const webhookLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '60 s'),
      analytics: true,
      prefix: 'rl',
    })
  : null;

export async function rateLimit(
  identifier: string,
  maxRequests = 10
): Promise<NextResponse | null> {
  const limiter = maxRequests === 20 ? webhookLimiter : defaultLimiter;
  if (!limiter) return null; // dev mode, no Redis

  const { success, limit, remaining, reset } = await limiter.limit(identifier);
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(reset),
          'Retry-After': '60',
        },
      }
    );
  }
  return null;
}

// Groq: 30 AI replies / 60s per provider (prevents one tenant exhausting shared key)
const groqLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '60 s'),
      analytics: true,
      prefix: 'rl:groq',
    })
  : null;

export async function groqRateLimit(providerId: string): Promise<boolean> {
  if (!groqLimiter) return false; // dev mode
  const { success } = await groqLimiter.limit(`groq:${providerId}`);
  return !success; // true = rate limited
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}
