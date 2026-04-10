import {
  generateAccessToken,
  hashAccessToken,
  validateAccessToken,
} from '@/lib/ruta/access-token'

describe('access-token', () => {
  describe('generateAccessToken', () => {
    it('returns a 64-char hex string', () => {
      const token = generateAccessToken()
      expect(token).toMatch(/^[a-f0-9]{64}$/)
    })

    it('generates unique tokens', () => {
      const t1 = generateAccessToken()
      const t2 = generateAccessToken()
      expect(t1).not.toBe(t2)
    })
  })

  describe('hashAccessToken', () => {
    it('returns a 64-char hex SHA-256 hash', () => {
      const hash = hashAccessToken('test-token')
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('produces consistent hashes', () => {
      const h1 = hashAccessToken('same-input')
      const h2 = hashAccessToken('same-input')
      expect(h1).toBe(h2)
    })

    it('produces different hashes for different inputs', () => {
      const h1 = hashAccessToken('token-a')
      const h2 = hashAccessToken('token-b')
      expect(h1).not.toBe(h2)
    })
  })

  describe('validateAccessToken', () => {
    it('returns true for a matching token and hash', () => {
      const token = generateAccessToken()
      const hash = hashAccessToken(token)
      expect(validateAccessToken(token, hash)).toBe(true)
    })

    it('returns false for mismatched token', () => {
      const token = generateAccessToken()
      const hash = hashAccessToken(token)
      expect(validateAccessToken('wrong-token-value-with-sufficient-length-for-hex', hash)).toBe(false)
    })

    it('returns false for null provided token', () => {
      expect(validateAccessToken(null, 'somehash')).toBe(false)
    })

    it('returns false for null stored hash', () => {
      expect(validateAccessToken('sometoken', null)).toBe(false)
    })

    it('returns false for both null', () => {
      expect(validateAccessToken(null, null)).toBe(false)
    })
  })
})
