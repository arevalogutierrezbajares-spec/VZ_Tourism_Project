import { NextRequest, NextResponse } from 'next/server'
import { verifyRutaWebhook } from '@/lib/ruta/stripe'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event
  try {
    event = await verifyRutaWebhook(body, signature)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  const supabase = await createServiceClient()
  if (!supabase) {
    console.error('RUTA webhook: database not configured')
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const rideId = session.metadata?.ride_id
    const product = session.metadata?.product

    if (product !== 'ruta' || !rideId) {
      // Not a RUTA payment, ignore
      return NextResponse.json({ received: true })
    }

    // Idempotency: check if already confirmed
    const { data: ride } = await supabase
      .from('ruta_rides')
      .select('id, status, stripe_payment_intent_id')
      .eq('id', rideId)
      .single()

    if (!ride) {
      console.error(`RUTA webhook: ride ${rideId} not found`)
      return NextResponse.json({ received: true })
    }

    if (ride.stripe_payment_intent_id === session.payment_intent) {
      // Already processed, idempotent
      return NextResponse.json({ received: true })
    }

    // Update ride to confirmed
    await supabase
      .from('ruta_rides')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        stripe_payment_intent_id: session.payment_intent as string,
      })
      .eq('id', rideId)
      .eq('status', 'pending_payment') // Atomic check

    // TODO: Trigger booking_confirmed notification (async, Phase 2)
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object
    const rideId = session.metadata?.ride_id
    const product = session.metadata?.product

    if (product === 'ruta' && rideId) {
      await supabase
        .from('ruta_rides')
        .update({
          status: 'payment_expired',
          payment_status: 'expired',
        })
        .eq('id', rideId)
        .eq('status', 'pending_payment')
    }
  }

  // Return 200 fast (notifications handled async)
  return NextResponse.json({ received: true })
}
