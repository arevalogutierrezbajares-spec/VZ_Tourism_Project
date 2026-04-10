import { randomBytes, createHash, timingSafeEqual } from 'crypto'

export function generateAccessToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashAccessToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function validateAccessToken(
  provided: string | null,
  storedHash: string | null
): boolean {
  if (!provided || !storedHash) return false
  const providedHash = hashAccessToken(provided)
  const storedBuf = Buffer.from(storedHash, 'hex')
  const providedBuf = Buffer.from(providedHash, 'hex')
  if (storedBuf.length !== providedBuf.length) return false
  return timingSafeEqual(storedBuf, providedBuf)
}
