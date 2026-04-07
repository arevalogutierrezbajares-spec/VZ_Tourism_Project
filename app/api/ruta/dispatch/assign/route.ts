import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { ride_id, driver_id, vehicle_id } = await request.json()

  if (!ride_id || !driver_id || !vehicle_id) {
    return NextResponse.json({ error: 'Missing ride_id, driver_id, or vehicle_id' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  // Assign driver + vehicle to ride (atomic status check)
  const { data: ride, error } = await supabase
    .from('ruta_rides')
    .update({
      driver_id,
      vehicle_id,
      status: 'assigned',
    })
    .eq('id', ride_id)
    .eq('status', 'confirmed') // Only assign confirmed rides
    .select('id, status')
    .single()

  if (error) {
    console.error('Assign error:', error)
    // Could be the unique constraint on active rides per driver
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Driver already has an active ride' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!ride) {
    return NextResponse.json({ error: 'Ride not found or not in confirmed status' }, { status: 400 })
  }

  // Update driver status to on_ride
  await supabase
    .from('ruta_drivers')
    .update({ status: 'on_ride' })
    .eq('id', driver_id)

  return NextResponse.json({ success: true, ride })
}
