// RUTA Executive Security Transport - Type Definitions

// ============================================================
// Enums (matching database enums)
// ============================================================

export type RutaDriverStatus = 'available' | 'on_ride' | 'offline' | 'suspended'

export type RutaVehicleClass = 'sedan' | 'suv' | 'van'

export type RutaArmorRating = 'b4' | 'b5' | 'none'

export type RutaRideType = 'airport' | 'inter_city' | 'intra_city'

export type RutaRideStatus =
  | 'requested'
  | 'pending_payment'
  | 'confirmed'
  | 'assigned'
  | 'driver_en_route'
  | 'pickup'
  | 'in_progress'
  | 'completed'
  | 'cancelled_by_passenger'
  | 'cancelled_by_ops'
  | 'payment_expired'

export type RutaPaymentMethod = 'stripe' | 'zelle'

export type RutaPaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed' | 'expired'

// ============================================================
// Database Row Types
// ============================================================

export interface RutaDriver {
  id: string
  user_id: string | null
  full_name: string
  phone: string
  email: string | null
  photo_url: string | null
  license_number: string
  license_expiry: string | null
  status: RutaDriverStatus
  tracker_device_id: string | null
  onboarded_at: string | null
  documents_verified: boolean
  created_at: string
  updated_at: string
}

export interface RutaVehicle {
  id: string
  make: string
  model: string
  year: number
  color: string
  plate_number: string
  vehicle_class: RutaVehicleClass
  armor_rating: RutaArmorRating
  insurance_expiry: string | null
  tracker_device_id: string | null
  tracker_api_key_hash: string | null
  camera_feed_url: string | null
  capacity: number
  created_at: string
  updated_at: string
}

export interface RutaDriverVehicle {
  id: string
  driver_id: string
  vehicle_id: string
  assigned_at: string
  unassigned_at: string | null
}

export interface RutaRide {
  id: string
  passenger_user_id: string | null
  passenger_name: string
  passenger_email: string
  passenger_phone: string
  passenger_access_token: string | null
  driver_id: string | null
  vehicle_id: string | null
  ride_type: RutaRideType
  pickup_location: unknown | null // PostGIS point
  pickup_address: string
  dropoff_location: unknown | null // PostGIS point
  dropoff_address: string
  waypoints: Array<{ lat: number; lng: number; address: string }> | null
  scheduled_at: string
  picked_up_at: string | null
  completed_at: string | null
  distance_km: number | null
  duration_minutes: number | null
  price_quoted_usd: number
  price_final_usd: number | null
  payment_method: RutaPaymentMethod
  payment_status: RutaPaymentStatus
  stripe_payment_intent_id: string | null
  stripe_checkout_session_id: string | null
  zelle_confirmation_code: string | null
  zelle_verified_by: string | null
  zelle_verified_at: string | null
  status: RutaRideStatus
  cancellation_reason: string | null
  driver_rating: number | null
  passenger_rating: number | null
  created_at: string
  updated_at: string
}

export interface RutaRidePricing {
  id: string
  route_type: RutaRideType
  origin_zone: string | null
  destination_zone: string | null
  base_fare_usd: number
  per_km_rate: number
  per_minute_rate: number
  per_hour_rate: number
  fixed_price_usd: number | null
  active: boolean
  created_at: string
}

export interface RutaVehicleClassPricing {
  id: string
  vehicle_class: RutaVehicleClass
  multiplier: number
  created_at: string
}

export interface RutaTrackerPing {
  id: number
  device_id: string
  ride_id: string | null
  lat: number
  lng: number
  speed: number | null
  heading: number | null
  timestamp: string
  created_at: string
}

export interface RutaZone {
  id: string
  name: string
  zone_type: string
  geom: unknown // PostGIS polygon
  created_at: string
}

// ============================================================
// API Types
// ============================================================

export interface RutaQuoteRequest {
  ride_type: RutaRideType
  pickup_lat: number
  pickup_lng: number
  pickup_address: string
  dropoff_lat: number
  dropoff_lng: number
  dropoff_address: string
  vehicle_class: RutaVehicleClass
  scheduled_at: string
  passengers: number
  hours?: number // for hourly intra-city
}

export interface RutaQuoteResponse {
  price_usd: number
  distance_km: number | null
  duration_minutes: number | null
  breakdown: {
    base_fare: number
    distance_charge: number
    time_charge: number
    multiplier: number
    multiplier_name: string
  }
  expires_at: string // ISO timestamp, 15 min from now
  route_type: RutaRideType
  vehicle_class: RutaVehicleClass
}

export interface RutaBookingRequest {
  ride_type: RutaRideType
  pickup_lat: number
  pickup_lng: number
  pickup_address: string
  dropoff_lat: number
  dropoff_lng: number
  dropoff_address: string
  waypoints?: Array<{ lat: number; lng: number; address: string }>
  vehicle_class: RutaVehicleClass
  scheduled_at: string // ISO 8601 with timezone offset
  passengers: number
  passenger_name: string
  passenger_email: string
  passenger_phone: string
  payment_method: RutaPaymentMethod
  price_quoted_usd: number
  hours?: number
}

export interface RutaTrackerPingRequest {
  device_id: string
  lat: number
  lng: number
  speed?: number
  heading?: number
  timestamp: string
}

// ============================================================
// Ride with Relations (for dispatch views)
// ============================================================

export interface RutaRideWithDetails extends RutaRide {
  driver?: RutaDriver | null
  vehicle?: RutaVehicle | null
}

export interface RutaDriverWithVehicle extends RutaDriver {
  current_vehicle?: RutaVehicle | null
}

// ============================================================
// State Machine
// ============================================================

export const RUTA_VALID_TRANSITIONS: Record<RutaRideStatus, RutaRideStatus[]> = {
  requested: ['pending_payment', 'cancelled_by_passenger', 'cancelled_by_ops'],
  pending_payment: ['confirmed', 'payment_expired', 'cancelled_by_passenger', 'cancelled_by_ops'],
  confirmed: ['assigned', 'cancelled_by_passenger', 'cancelled_by_ops'],
  assigned: ['driver_en_route', 'cancelled_by_passenger', 'cancelled_by_ops'],
  driver_en_route: ['pickup', 'cancelled_by_ops'],
  pickup: ['in_progress', 'cancelled_by_ops'],
  in_progress: ['completed', 'cancelled_by_ops'],
  completed: [],
  cancelled_by_passenger: [],
  cancelled_by_ops: [],
  payment_expired: [],
}

// Terminal statuses (no further transitions possible)
export const RUTA_TERMINAL_STATUSES: RutaRideStatus[] = [
  'completed',
  'cancelled_by_passenger',
  'cancelled_by_ops',
  'payment_expired',
]

// Minimum lead times by ride type (in minutes)
export const RUTA_MIN_LEAD_TIMES: Record<RutaRideType, number> = {
  airport: 120,    // 2 hours
  inter_city: 240, // 4 hours
  intra_city: 60,  // 1 hour
}

// Venezuela bounding box for tracker validation
export const VZ_BBOX = {
  minLat: 0.5,
  maxLat: 13.0,
  minLng: -73.5,
  maxLng: -59.0,
}
