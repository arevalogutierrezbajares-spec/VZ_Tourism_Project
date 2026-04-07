import { randomBytes } from 'crypto'

export function generateAccessToken(): string {
  return randomBytes(32).toString('hex')
}

export function validateAccessToken(
  provided: string | null,
  stored: string | null
): boolean {
  if (!provided || !stored) return false
  if (provided.length !== stored.length) return false
  // Timing-safe comparison
  let result = 0
  for (let i = 0; i < provided.length; i++) {
    result |= provided.charCodeAt(i) ^ stored.charCodeAt(i)
  }
  return result === 0
}
