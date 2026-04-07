import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { calculateRefund } from '@/lib/ruta/cancellation'
import { isValidTransition } from '@/lib/ruta/ride-status'
import type { RutaRideStatus } from '@/types/ruta'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rideId } = await params

  const supabase = await createClient()
  const serviceClient = await createServiceClient()
  const dbClient = serviceClient || supabase
  if (!dbClient) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  let user = null
  if (supabase) {
    const { data } = await supabase.auth.getUser()
    user = data.user
  }

  // Get ride
  const { data: ride, error: fetchError } = await dbClient
    .from('ruta_rides')
    .select('*')
    .eq('id', rideId)
    .single()

  if (fetchError || !ride) {
    return NextResponse.json({ error: 'Ride not found' }, { status: 404 })
  }

  // Determine who is cancelling
  const isOwner = user && ride.passenger_user_id === user.id
  const userMeta = user?.user_metadata as Record<string, unknown> | undefined
  const rutaRole = userMeta?.ruta_role as string | undefined
  const isDispatcher = rutaRole === 'ruta_dispatcher' || rutaRole === 'ruta_admin'

  const isDev = process.env.NODE_ENV === 'development'
  if (!isOwner && !isDispatcher && !isDev) {
    return NextResponse.json(
      { error: 'Forbidden: you can only cancel your own rides' },
      { status: 403 }
    )
  }

  const cancelledBy = isDispatcher && !isOwner ? 'ops' : 'passenger'
  const newStatus: RutaRideStatus = cancelledBy === 'ops'
    ? 'cancelled_by_ops'
    : 'cancelled_by_passenger'

  // Validate transition
  if (!isValidTransition(ride.status as RutaRideStatus, newStatus)) {
    return NextResponse.json(
      { error: `Cannot cancel a ride in ${ride.status} status` },
      { status: 400 }
    )
  }

  // Calculate refund
  const refund = calculateRefund(
    Number(ride.price_quoted_usd),
    ride.scheduled_at,
    cancelledBy,
    ride.payment_method
  )

  // Parse optional reason
  let reason: string | undefined
  try {
    const body = await request.json()
    reason = body.reason
  } catch {
    // No body, that's fine
  }

  // Update ride
  const { error: updateError } = await dbClient
    .from('ruta_rides')
    .update({
      status: newStatus,
      cancellation_reason: reason || null,
      price_final_usd: refund.refund_amount_usd > 0
        ? Number(ride.price_quoted_usd) - refund.refund_amount_usd
        : Number(ride.price_quoted_usd),
    })
    .eq('id', rideId)
    .eq('status', ride.status) // Atomic check

  if (updateError) {
    console.error('Failed to cancel ride:', updateError)
    return NextResponse.json(
      { error: 'Failed to cancel ride' },
      { status: 500 }
    )
  }

  // Release driver if ride was assigned
  if (ride.driver_id) {
    await dbClient
      .from('ruta_drivers')
      .update({ status: 'available' })
      .eq('id', ride.driver_id)
      .eq('status', 'on_ride')
  }

  // TODO: Trigger Stripe refund if payment_method === 'stripe' && refund.refund_amount_usd > 0
  // TODO: Send cancellation notification

  return NextResponse.json({
    success: true,
    ride_id: rideId,
    cancelled_by: cancelledBy,
    refund: {
      percentage: refund.refund_percentage,
      amount_usd: refund.refund_amount_usd,
      reason: refund.reason,
    },
  })
}
