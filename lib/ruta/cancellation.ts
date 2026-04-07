import type { RutaPaymentMethod } from '@/types/ruta'

export interface CancellationResult {
  refund_percentage: number
  refund_amount_usd: number
  reason: string
}

export function calculateRefund(
  priceQuotedUsd: number,
  scheduledAt: string,
  cancelledBy: 'passenger' | 'ops',
  paymentMethod: RutaPaymentMethod
): CancellationResult {
  // Ops cancellation = full refund always
  if (cancelledBy === 'ops') {
    return {
      refund_percentage: 100,
      refund_amount_usd: priceQuotedUsd,
      reason: 'Cancelled by operations. Full refund.',
    }
  }

  const now = new Date()
  const scheduled = new Date(scheduledAt)
  const hoursUntilPickup = (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (hoursUntilPickup > 24) {
    const refund = Math.round(priceQuotedUsd * 0.95 * 100) / 100
    return {
      refund_percentage: 95,
      refund_amount_usd: refund,
      reason: 'More than 24 hours before pickup. Full refund minus 5% processing fee.',
    }
  }

  if (hoursUntilPickup >= 2) {
    const refund = Math.round(priceQuotedUsd * 0.5 * 100) / 100
    return {
      refund_percentage: 50,
      refund_amount_usd: refund,
      reason: '2-24 hours before pickup. 50% refund.',
    }
  }

  return {
    refund_percentage: 0,
    refund_amount_usd: 0,
    reason: 'Less than 2 hours before pickup. No refund.',
  }
}
