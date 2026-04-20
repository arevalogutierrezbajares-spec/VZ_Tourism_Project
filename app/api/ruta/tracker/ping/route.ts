import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { trackerPingSchema, isWithinVenezuela, isAnomalousPing } from '@/lib/ruta/tracker'
import { createHash, timingSafeEqual } from 'crypto'

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

  // Venezuela bounding box check
  if (!isWithinVenezuela(ping.lat, ping.lng)) {
    return NextResponse.json(
      { error: 'Coordinates outside Venezuela bounding box' },
      { status: 400 }
    )
  }

  const supabase = await createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  // Authenticate: find vehicle with matching tracker_device_id + verify API key (H2)
  const { data: vehicle, error: vehicleError } = await supabase
    .from('ruta_vehicles')
    .select('id, tracker_device_id, tracker_api_key_hash')
    .eq('tracker_device_id', ping.device_id)
    .single()

  if (vehicleError || !vehicle) {
    return NextResponse.json(
      { error: 'Unknown device' },
      { status: 401 }
    )
  }

  // Verify API key against stored hash
  if (vehicle.tracker_api_key_hash) {
    const providedHash = createHash('sha256').update(apiKey).digest('hex')
    const storedHash = Buffer.from(vehicle.tracker_api_key_hash, 'hex')
    const providedBuf = Buffer.from(providedHash, 'hex')
    if (storedHash.length !== providedBuf.length || !timingSafeEqual(storedHash, providedBuf)) {
      return NextResponse.json(
        { error: 'Invalid tracker API key' },
        { status: 401 }
      )
    }
  }

  // DB-based rate limit: 1 ping per 5 seconds per device (H3)
  const { data: recentPing } = await supabase
    .from('ruta_tracker_pings')
    .select('id')
    .eq('device_id', ping.device_id)
    .gte('timestamp', new Date(Date.now() - 5000).toISOString())
    .limit(1)
    .maybeSingle()

  if (recentPing) {
    return NextResponse.json(
      { error: 'Rate limited: max 1 ping per 5 seconds' },
      { status: 429 }
    )
  }

  // Find active ride for this vehicle
  const { data: activeRide } = await supabase
    .from('ruta_rides')
    .select('id')
    .eq('vehicle_id', vehicle.id)
    .in('status', ['assigned', 'driver_en_route', 'pickup', 'in_progress'])
    .limit(1)
    .maybeSingle()

  // Get previous ping for anomaly comparison
  const { data: prevPing } = await supabase
    .from('ruta_tracker_pings')
    .select('lat, lng, timestamp')
    .eq('device_id', ping.device_id)
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Check for anomalous ping (with previous ping context)
  const anomaly = isAnomalousPing(
    ping,
    prevPing ? { lat: prevPing.lat, lng: prevPing.lng, timestamp: prevPing.timestamp } : undefined
  )
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

  return NextResponse.json({ ok: true, ride_id: activeRide?.id || null })
}
