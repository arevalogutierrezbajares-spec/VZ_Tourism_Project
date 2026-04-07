import { NextRequest, NextResponse } from 'next/server'
import { calculateQuote } from '@/lib/ruta/pricing'
import type { RutaRideType, RutaVehicleClass } from '@/types/ruta'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams

  const ride_type = params.get('ride_type') as RutaRideType | null
  const pickup_lat = params.get('pickup_lat')
  const pickup_lng = params.get('pickup_lng')
  const dropoff_lat = params.get('dropoff_lat')
  const dropoff_lng = params.get('dropoff_lng')
  const vehicle_class = (params.get('vehicle_class') || 'suv') as RutaVehicleClass
  const hours = params.get('hours')

  if (!ride_type || !pickup_lat || !pickup_lng || !dropoff_lat || !dropoff_lng) {
    return NextResponse.json(
      { error: 'Missing required parameters: ride_type, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng' },
      { status: 400 }
    )
  }

  const validTypes: RutaRideType[] = ['airport', 'inter_city', 'intra_city']
  if (!validTypes.includes(ride_type)) {
    return NextResponse.json(
      { error: `Invalid ride_type. Must be one of: ${validTypes.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    const quote = await calculateQuote({
      ride_type,
      pickup_lat: parseFloat(pickup_lat),
      pickup_lng: parseFloat(pickup_lng),
      pickup_address: params.get('pickup_address') || undefined,
      dropoff_lat: parseFloat(dropoff_lat),
      dropoff_lng: parseFloat(dropoff_lng),
      dropoff_address: params.get('dropoff_address') || undefined,
      vehicle_class,
      hours: hours ? parseFloat(hours) : undefined,
    })

    return NextResponse.json(quote)
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Unable to calculate price. Please try again.'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
