import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createRutaCheckoutSession } from '@/lib/ruta/stripe'
import { generateAccessToken, hashAccessToken } from '@/lib/ruta/access-token'
import { bookingRequestSchema } from '@/lib/ruta/booking-validation'
import { calculateQuote } from '@/lib/ruta/pricing'
import { RUTA_MIN_LEAD_TIMES } from '@/types/ruta'

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json()

    // Validate with Zod schema (H4)
    const parsed = bookingRequestSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid booking data', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const body = parsed.data

    // Validate minimum lead time
    const leadMinutes = RUTA_MIN_LEAD_TIMES[body.ride_type]
    const scheduledTime = new Date(body.scheduled_at).getTime()
    const minTime = Date.now() + leadMinutes * 60 * 1000
    if (scheduledTime < minTime) {
      return NextResponse.json(
        {
          error: `Minimum ${leadMinutes / 60} hours lead time required for ${body.ride_type.replace('_', ' ')} rides`,
        },
        { status: 400 }
      )
    }

    // Server-side price re-validation (H1)
    try {
      const serverQuote = await calculateQuote({
        ride_type: body.ride_type,
        pickup_lat: body.pickup_lat,
        pickup_lng: body.pickup_lng,
        pickup_address: body.pickup_address,
        dropoff_lat: body.dropoff_lat,
        dropoff_lng: body.dropoff_lng,
        dropoff_address: body.dropoff_address,
        vehicle_class: body.vehicle_class,
        hours: body.hours,
      })
      const priceDelta = Math.abs(serverQuote.price_usd - body.price_quoted_usd) / serverQuote.price_usd
      if (priceDelta > 0.05) {
        return NextResponse.json(
          { error: 'Quote has expired or price has changed. Please get a new quote.' },
          { status: 409 }
        )
      }
    } catch (priceValidationError) {
      console.error('Price validation unavailable:', priceValidationError)
      return NextResponse.json({ error: 'Price validation temporarily unavailable. Please try again.' }, { status: 503 })
    }

    const supabase = await createClient()
    const serviceClient = await createServiceClient()

    // Check if user is authenticated
    let userId: string | null = null
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id || null
    }

    // Generate and hash access token (H5)
    const accessToken = generateAccessToken()
    const accessTokenHash = hashAccessToken(accessToken)

    const dbClient = serviceClient || supabase
    if (!dbClient) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Create ride record
    const { data: ride, error: rideError } = await dbClient
      .from('ruta_rides')
      .insert({
        passenger_user_id: userId,
        passenger_name: body.passenger_name,
        passenger_email: body.passenger_email,
        passenger_phone: body.passenger_phone,
        passenger_access_token: accessTokenHash,
        ride_type: body.ride_type,
        pickup_address: body.pickup_address,
        dropoff_address: body.dropoff_address,
        waypoints: body.waypoints || null,
        scheduled_at: body.scheduled_at,
        price_quoted_usd: body.price_quoted_usd,
        payment_method: body.payment_method,
        payment_status: 'pending',
        status: 'pending_payment',
        distance_km: null,
        duration_minutes: null,
      })
      .select('id')
      .single()

    if (rideError || !ride) {
      console.error('Failed to create ride:', rideError)
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      )
    }

    // Handle Stripe payment
    if (body.payment_method === 'stripe') {
      const origin = request.nextUrl.origin
      const session = await createRutaCheckoutSession({
        rideId: ride.id,
        rideType: body.ride_type,
        amountUsd: body.price_quoted_usd,
        passengerEmail: body.passenger_email,
        passengerName: body.passenger_name,
        pickupAddress: body.pickup_address,
        dropoffAddress: body.dropoff_address,
        scheduledAt: body.scheduled_at,
        successUrl: `${origin}/ruta/book/confirmation?ride_id=${ride.id}&token=${accessToken}`,
        cancelUrl: `${origin}/ruta?cancelled=true`,
      })

      await dbClient
        .from('ruta_rides')
        .update({ stripe_checkout_session_id: session.id })
        .eq('id', ride.id)

      return NextResponse.json({
        ride_id: ride.id,
        checkout_url: session.url,
        access_token: accessToken,
      })
    }

    // Handle Zelle payment
    if (body.payment_method === 'zelle') {
      return NextResponse.json({
        ride_id: ride.id,
        access_token: accessToken,
        payment_method: 'zelle',
        zelle_info: {
          recipient_email: process.env.RUTA_ZELLE_EMAIL || 'payments@rutasecure.com',
          recipient_phone: process.env.RUTA_ZELLE_PHONE || '',
          memo: `RUTA-${ride.id.slice(0, 8).toUpperCase()}`,
          amount_usd: body.price_quoted_usd,
        },
      })
    }

    return NextResponse.json(
      { error: 'Invalid payment method' },
      { status: 400 }
    )
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
