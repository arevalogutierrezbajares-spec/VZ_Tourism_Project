import { calculateRefund } from '@/lib/ruta/cancellation'

describe('calculateRefund', () => {
  const price = 300

  it('returns 100% refund for ops cancellation', () => {
    const result = calculateRefund(price, new Date().toISOString(), 'ops', 'stripe')
    expect(result.refund_percentage).toBe(100)
    expect(result.refund_amount_usd).toBe(300)
  })

  it('returns 95% refund for passenger cancel >24hrs before', () => {
    const future = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    const result = calculateRefund(price, future, 'passenger', 'stripe')
    expect(result.refund_percentage).toBe(95)
    expect(result.refund_amount_usd).toBe(285)
  })

  it('returns 50% refund for passenger cancel 2-24hrs before', () => {
    const future = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
    const result = calculateRefund(price, future, 'passenger', 'stripe')
    expect(result.refund_percentage).toBe(50)
    expect(result.refund_amount_usd).toBe(150)
  })

  it('returns 0% refund for passenger cancel <2hrs before', () => {
    const future = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    const result = calculateRefund(price, future, 'passenger', 'stripe')
    expect(result.refund_percentage).toBe(0)
    expect(result.refund_amount_usd).toBe(0)
  })

  it('returns 50% at exactly 2 hours', () => {
    const future = new Date(Date.now() + 2 * 60 * 60 * 1000 + 1000).toISOString()
    const result = calculateRefund(price, future, 'passenger', 'zelle')
    expect(result.refund_percentage).toBe(50)
  })

  it('ops cancellation always 100% regardless of timing', () => {
    const past = new Date(Date.now() - 1000).toISOString()
    const result = calculateRefund(price, past, 'ops', 'zelle')
    expect(result.refund_percentage).toBe(100)
    expect(result.refund_amount_usd).toBe(300)
  })

  it('handles fractional cents with rounding', () => {
    const future = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    const result = calculateRefund(99.99, future, 'passenger', 'stripe')
    expect(result.refund_amount_usd).toBe(94.99) // 99.99 * 0.95 = 94.9905 → 94.99
  })
})
