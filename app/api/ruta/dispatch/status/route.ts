import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireRutaRole } from '@/lib/ruta/auth'
import { isValidTransition } from '@/lib/ruta/ride-status'
import type { RutaRideStatus } from '@/types/ruta'

export async function POST(request: NextRequest) {
  const auth = await requireRutaRole(['ruta_dispatcher', 'ruta_admin'])
  if (auth.error) return auth.error

  const { ride_id, new_status } = await request.json()

  if (!ride_id || !new_status) {
    return NextResponse.json({ error: 'Missing ride_id or new_status' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  // Get current ride status
  const { data: ride, error: fetchError } = await supabase
    .from('ruta_rides')
    .select('id, status, driver_id')
    .eq('id', ride_id)
    .single()

  if (fetchError || !ride) {
    return NextResponse.json({ error: 'Ride not found' }, { status: 404 })
  }

  // Validate transition
  if (!isValidTransition(ride.status as RutaRideStatus, new_status as RutaRideStatus)) {
    return NextResponse.json({
      error: `Invalid transition: ${ride.status} → ${new_status}`,
    }, { status: 400 })
  }

  // Build update payload
  const update: Record<string, unknown> = { status: new_status }
  if (new_status === 'pickup') {
    update.picked_up_at = new Date().toISOString()
  }
  if (new_status === 'completed') {
    update.completed_at = new Date().toISOString()
  }

  const { error: updateError } = await supabase
    .from('ruta_rides')
    .update(update)
    .eq('id', ride_id)
    .eq('status', ride.status) // Atomic check

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Reset driver to available on completion or cancellation
  const driverResetStatuses = ['completed', 'cancelled_by_ops']
  if (driverResetStatuses.includes(new_status) && ride.driver_id) {
    await supabase
      .from('ruta_drivers')
      .update({ status: 'available' })
      .eq('id', ride.driver_id)
  }

  return NextResponse.json({ success: true, ride_id, status: new_status })
}
