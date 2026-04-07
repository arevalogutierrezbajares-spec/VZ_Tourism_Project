import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createRutaCheckoutSession } from '@/lib/ruta/stripe'
import { generateAccessToken } from '@/lib/ruta/access-token'
import type { RutaBookingRequest } from '@/types/ruta'
import { RUTA_MIN_LEAD_TIMES } from '@/types/ruta'

export async function POST(request: NextRequest) {
  try {
    const body: RutaBookingRequest = await request.json()

    // Validate required fields
    if (
      !body.ride_type ||
      !body.pickup_address ||
      !body.dropoff_address ||
      !body.scheduled_at ||
      !body.passenger_name ||
      !body.passenger_email ||
      !body.passenger_phone ||
      !body.payment_method ||
      !body.price_quoted_usd
    ) {
      return NextResponse.json(
        { error: 'Missing required booking fields' },
        { status: 400 }
      )
    }

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

    const supabase = await createClient()
    const serviceClient = await createServiceClient()

    // Check if user is authenticated (using regular client)
    let userId: string | null = null
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id || null
    }

    // Generate access token for guest checkout
    const accessToken = generateAccessToken()

    // Use service client to bypass RLS for guest checkout
    const dbClient = serviceClient || supabase
    if (!dbClient) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Create ride record (service role bypasses RLS)
    const { data: ride, error: rideError } = await dbClient
      .from('ruta_rides')
      .insert({
        passenger_user_id: userId,
        passenger_name: body.passenger_name,
        passenger_email: body.passenger_email,
        passenger_phone: body.passenger_phone,
        passenger_access_token: accessToken,
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

      // Update ride with Stripe session ID
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
