import { NextRequest, NextResponse } from 'next/server'
import { requireRutaRole } from '@/lib/ruta/auth'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // Require dispatcher or admin role
  const auth = await requireRutaRole(['ruta_dispatcher', 'ruta_admin'])
  if (auth.error) return auth.error

  try {
    const { ride_id, verified_amount_usd } = await request.json()

    if (!ride_id) {
      return NextResponse.json(
        { error: 'Missing ride_id' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get ride and validate state
    const { data: ride, error: fetchError } = await supabase
      .from('ruta_rides')
      .select('id, status, payment_method, zelle_confirmation_code, price_quoted_usd')
      .eq('id', ride_id)
      .single()

    if (fetchError || !ride) {
      return NextResponse.json(
        { error: 'Ride not found' },
        { status: 404 }
      )
    }

    if (ride.status !== 'pending_payment') {
      return NextResponse.json(
        { error: `Ride is in ${ride.status} state, expected pending_payment` },
        { status: 400 }
      )
    }

    if (ride.payment_method !== 'zelle') {
      return NextResponse.json(
        { error: 'This ride does not use Zelle payment' },
        { status: 400 }
      )
    }

    // Update ride to confirmed with audit trail
    const { error: updateError } = await supabase
      .from('ruta_rides')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        zelle_verified_by: auth.user.id,
        zelle_verified_at: new Date().toISOString(),
      })
      .eq('id', ride_id)
      .eq('status', 'pending_payment') // Atomic check

    if (updateError) {
      console.error('Failed to confirm Zelle payment:', updateError)
      return NextResponse.json(
        { error: 'Failed to confirm payment' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      ride_id,
      verified_by: auth.user.id,
    })
  } catch (err) {
    console.error('Zelle confirm error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
