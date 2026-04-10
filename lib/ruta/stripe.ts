import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/server'

export interface RutaCheckoutParams {
  rideId: string
  rideType: string
  amountUsd: number
  passengerEmail: string
  passengerName: string
  pickupAddress: string
  dropoffAddress: string
  scheduledAt: string
  successUrl: string
  cancelUrl: string
}

export async function createRutaCheckoutSession({
  rideId,
  rideType,
  amountUsd,
  passengerEmail,
  passengerName,
  pickupAddress,
  dropoffAddress,
  scheduledAt,
  successUrl,
  cancelUrl,
}: RutaCheckoutParams): Promise<Stripe.Checkout.Session> {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `RUTA ${rideType.replace('_', '-')} Transfer`,
            description: `${pickupAddress} → ${dropoffAddress}`,
          },
          unit_amount: Math.round(amountUsd * 100),
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    customer_email: passengerEmail,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      product: 'ruta',
      ride_id: rideId,
      ride_type: rideType,
      passenger_name: passengerName,
      scheduled_at: scheduledAt,
    },
    expires_at: Math.floor(Date.now() / 1000) + 1800, // 30 minutes from now
  })

  return session
}

export async function createRutaRefund(
  paymentIntentId: string,
  amountUsd: number,
  rideId: string
): Promise<Stripe.Refund> {
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: Math.round(amountUsd * 100),
  }, {
    idempotencyKey: `ruta-refund-${rideId}`,
  })
}

export async function verifyRutaWebhook(
  body: string,
  signature: string
): Promise<Stripe.Event> {
  const webhookSecret = process.env.RUTA_STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new Error('Stripe webhook secret not configured')
  }
  return stripe.webhooks.constructEvent(body, signature, webhookSecret)
}
