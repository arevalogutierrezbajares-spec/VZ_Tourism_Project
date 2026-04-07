import type {
  RutaRideType,
  RutaVehicleClass,
  RutaQuoteResponse,
} from '@/types/ruta'
import { createServiceClient } from '@/lib/supabase/server'

interface RouteInfo {
  distance_km: number
  duration_minutes: number
}

// Mapbox Directions API call
async function getRouteInfo(
  pickupLat: number,
  pickupLng: number,
  dropoffLat: number,
  dropoffLng: number
): Promise<RouteInfo> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) throw new Error('MAPBOX_TOKEN not configured')

  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${pickupLng},${pickupLat};${dropoffLng},${dropoffLat}?access_token=${token}&overview=false`

  const res = await fetch(url, { next: { revalidate: 86400 } }) // cache 24h
  if (!res.ok) {
    throw new Error(`Mapbox Directions API error: ${res.status}`)
  }

  const data = await res.json()
  if (!data.routes || data.routes.length === 0) {
    throw new Error('No route found between the specified locations')
  }

  const route = data.routes[0]
  return {
    distance_km: Math.round((route.distance / 1000) * 100) / 100,
    duration_minutes: Math.round(route.duration / 60),
  }
}

// Haversine fallback with road factor
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 1.4 * 100) / 100 // 1.4x road factor
}

export async function calculateQuote(params: {
  ride_type: RutaRideType
  pickup_lat: number
  pickup_lng: number
  pickup_address?: string
  dropoff_lat: number
  dropoff_lng: number
  dropoff_address?: string
  vehicle_class: RutaVehicleClass
  hours?: number
}): Promise<RutaQuoteResponse> {
  const supabase = await createServiceClient()
  if (!supabase) throw new Error('Database not configured')

  // Get vehicle class multiplier
  const { data: classData } = await supabase
    .from('ruta_vehicle_class_pricing')
    .select('multiplier')
    .eq('vehicle_class', params.vehicle_class)
    .single()

  const multiplier = classData?.multiplier ?? 1.0
  const multiplierName =
    params.vehicle_class === 'sedan'
      ? 'Standard Sedan'
      : params.vehicle_class === 'suv'
        ? 'Armored SUV'
        : 'Executive Van'

  // Airport: fixed price lookup by airport code
  if (params.ride_type === 'airport') {
    // Extract airport code from pickup address (e.g., "Maiquetia International Airport (CCS)" → "CCS")
    const airportCodes = ['CCS', 'PMV', 'VLN', 'BLA', 'MAR', 'MRD']
    const pickupText = params.pickup_address || ''
    const detectedCode = airportCodes.find(code => pickupText.toUpperCase().includes(code))

    let query = supabase
      .from('ruta_ride_pricing')
      .select('*')
      .eq('route_type', 'airport')
      .eq('active', true)

    if (detectedCode) {
      query = query.eq('origin_zone', detectedCode)
    }

    const { data: pricing } = await query

    // Use the first matching route. If multiple zones exist for this airport, pick any.
    const match = pricing?.[0]
    if (!match || !match.fixed_price_usd) {
      // Fallback: use default airport pricing if no zone match
      const { data: fallback } = await supabase
        .from('ruta_ride_pricing')
        .select('*')
        .eq('route_type', 'airport')
        .eq('active', true)
        .limit(1)
        .single()

      if (!fallback || !fallback.fixed_price_usd) {
        throw new Error('No pricing available for this airport route')
      }
      const price = Number(fallback.fixed_price_usd) * Number(multiplier)
      return {
        price_usd: Math.round(price * 100) / 100,
        distance_km: null,
        duration_minutes: null,
        breakdown: {
          base_fare: Number(fallback.fixed_price_usd),
          distance_charge: 0,
          time_charge: 0,
          multiplier: Number(multiplier),
          multiplier_name: multiplierName,
        },
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        route_type: params.ride_type,
        vehicle_class: params.vehicle_class,
      }
    }

    const price = Number(match.fixed_price_usd) * Number(multiplier)

    return {
      price_usd: Math.round(price * 100) / 100,
      distance_km: null,
      duration_minutes: null,
      breakdown: {
        base_fare: Number(match.fixed_price_usd),
        distance_charge: 0,
        time_charge: 0,
        multiplier: Number(multiplier),
        multiplier_name: multiplierName,
      },
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      route_type: params.ride_type,
      vehicle_class: params.vehicle_class,
    }
  }

  // Inter-city and Intra-city: calculate from route
  const { data: pricing } = await supabase
    .from('ruta_ride_pricing')
    .select('*')
    .eq('route_type', params.ride_type)
    .eq('active', true)
    .limit(1)
    .single()

  if (!pricing) {
    throw new Error(`No pricing configured for ${params.ride_type} routes`)
  }

  // Get route info from Mapbox (with haversine fallback)
  let routeInfo: RouteInfo
  try {
    routeInfo = await getRouteInfo(
      params.pickup_lat,
      params.pickup_lng,
      params.dropoff_lat,
      params.dropoff_lng
    )
  } catch {
    // Haversine fallback
    const distance = haversineDistance(
      params.pickup_lat,
      params.pickup_lng,
      params.dropoff_lat,
      params.dropoff_lng
    )
    routeInfo = {
      distance_km: distance,
      duration_minutes: Math.round(distance * 1.5), // rough estimate
    }
  }

  const baseFare = Number(pricing.base_fare_usd)
  const distanceCharge = routeInfo.distance_km * Number(pricing.per_km_rate)

  let timeCharge = 0
  if (params.ride_type === 'intra_city') {
    if (params.hours && Number(pricing.per_hour_rate) > 0) {
      // Hourly booking
      timeCharge = params.hours * Number(pricing.per_hour_rate)
    } else {
      timeCharge = routeInfo.duration_minutes * Number(pricing.per_minute_rate)
    }
  }

  const subtotal = baseFare + distanceCharge + timeCharge
  const price = subtotal * Number(multiplier)

  return {
    price_usd: Math.round(price * 100) / 100,
    distance_km: routeInfo.distance_km,
    duration_minutes: routeInfo.duration_minutes,
    breakdown: {
      base_fare: baseFare,
      distance_charge: Math.round(distanceCharge * 100) / 100,
      time_charge: Math.round(timeCharge * 100) / 100,
      multiplier: Number(multiplier),
      multiplier_name: multiplierName,
    },
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    route_type: params.ride_type,
    vehicle_class: params.vehicle_class,
  }
}
