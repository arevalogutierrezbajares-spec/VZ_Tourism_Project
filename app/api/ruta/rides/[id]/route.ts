import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { validateAccessToken } from '@/lib/ruta/access-token'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rideId } = await params
  const token = request.nextUrl.searchParams.get('token')

  const serviceClient = await createServiceClient()
  if (!serviceClient) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  // Fetch ride using service role
  const { data: ride, error } = await serviceClient
    .from('ruta_rides')
    .select('*')
    .eq('id', rideId)
    .single()

  if (error || !ride) {
    return NextResponse.json({ error: 'Ride not found' }, { status: 404 })
  }

  // Validate access: authenticated owner OR valid token
  const supabase = await createClient()
  let authorized = false

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user && ride.passenger_user_id === user.id) {
      authorized = true
    }
  }

  if (!authorized && token) {
    authorized = validateAccessToken(token, ride.passenger_access_token)
  }

  // Dev bypass
  if (!authorized && process.env.NODE_ENV === 'development') {
    authorized = true
  }

  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Strip sensitive fields before returning
  const { passenger_access_token, ...safeRide } = ride
  return NextResponse.json(safeRide)
}
