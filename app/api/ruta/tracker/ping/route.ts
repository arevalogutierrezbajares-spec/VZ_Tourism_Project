import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { trackerPingSchema, isWithinVenezuela, isAnomalousPing } from '@/lib/ruta/tracker'

// Simple in-memory rate limiter (per-device, 5-second window)
const lastPingTimes = new Map<string, number>()

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-tracker-key')
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing X-Tracker-Key header' },
      { status: 401 }
    )
  }

  // Parse and validate body
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const parsed = trackerPingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid ping data', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const ping = parsed.data

  // Rate limit: 1 ping per 5 seconds per device
  const lastPing = lastPingTimes.get(ping.device_id)
  const now = Date.now()
  if (lastPing && now - lastPing < 5000) {
    return NextResponse.json(
      { error: 'Rate limited: max 1 ping per 5 seconds' },
      { status: 429 }
    )
  }
  lastPingTimes.set(ping.device_id, now)

  // Venezuela bounding box check
  if (!isWithinVenezuela(ping.lat, ping.lng)) {
    return NextResponse.json(
      { error: 'Coordinates outside Venezuela bounding box' },
      { status: 400 }
    )
  }

  // Authenticate: find vehicle with matching tracker_device_id
  // Uses service role to bypass RLS (tracker devices are not authenticated users)
  const supabase = await createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }
  const { data: vehicle, error: vehicleError } = await supabase
    .from('ruta_vehicles')
    .select('id, tracker_device_id')
    .eq('tracker_device_id', ping.device_id)
    .single()

  if (vehicleError || !vehicle) {
    return NextResponse.json(
      { error: 'Unknown device' },
      { status: 401 }
    )
  }

  // Find active ride for this vehicle
  const { data: activeRide } = await supabase
    .from('ruta_rides')
    .select('id')
    .eq('vehicle_id', vehicle.id)
    .in('status', ['assigned', 'driver_en_route', 'pickup', 'in_progress'])
    .limit(1)
    .single()

  // Check for anomalous ping
  const anomaly = isAnomalousPing(ping)
  if (anomaly.anomalous) {
    console.warn(`Anomalous tracker ping from ${ping.device_id}: ${anomaly.reason}`)
  }

  // Store ping
  const { error: insertError } = await supabase
    .from('ruta_tracker_pings')
    .insert({
      device_id: ping.device_id,
      ride_id: activeRide?.id || null,
      lat: ping.lat,
      lng: ping.lng,
      speed: ping.speed || null,
      heading: ping.heading || null,
      timestamp: ping.timestamp,
    })

  if (insertError) {
    console.error('Failed to store tracker ping:', insertError)
    return NextResponse.json(
      { error: 'Failed to store ping' },
      { status: 500 }
    )
  }

  // Broadcast via Supabase Realtime (if ride is active)
  if (activeRide) {
    const channel = supabase.channel(`ride-${activeRide.id}`)
    await channel.send({
      type: 'broadcast',
      event: 'tracker_ping',
      payload: {
        lat: ping.lat,
        lng: ping.lng,
        speed: ping.speed,
        heading: ping.heading,
        timestamp: ping.timestamp,
        device_id: ping.device_id,
      },
    })
  }

  return NextResponse.json({ ok: true, ride_id: activeRide?.id || null })
}
