import { z } from 'zod'

export const bookingRequestSchema = z.object({
  ride_type: z.enum(['airport', 'inter_city', 'intra_city']),
  pickup_lat: z.number().min(-90).max(90),
  pickup_lng: z.number().min(-180).max(180),
  pickup_address: z.string().min(1).max(500),
  dropoff_lat: z.number().min(-90).max(90),
  dropoff_lng: z.number().min(-180).max(180),
  dropoff_address: z.string().min(1).max(500),
  waypoints: z
    .array(
      z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        address: z.string().min(1).max(500),
      })
    )
    .optional(),
  vehicle_class: z.enum(['sedan', 'suv', 'van']),
  scheduled_at: z.string().datetime(),
  passengers: z.number().int().min(1).max(10),
  passenger_name: z.string().min(1).max(200).trim(),
  passenger_email: z.string().email().max(254),
  passenger_phone: z.string().min(5).max(30),
  payment_method: z.enum(['stripe', 'zelle']),
  price_quoted_usd: z.number().positive().max(100000),
  hours: z.number().positive().optional(),
})

export type ValidatedBookingRequest = z.infer<typeof bookingRequestSchema>
