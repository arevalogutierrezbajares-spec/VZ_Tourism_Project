import { bookingRequestSchema } from '@/lib/ruta/booking-validation'

const validBooking = {
  ride_type: 'airport' as const,
  pickup_lat: 10.6,
  pickup_lng: -66.9,
  pickup_address: 'Maiquetia International Airport (CCS)',
  dropoff_lat: 10.5,
  dropoff_lng: -66.85,
  dropoff_address: 'Hotel Tamanaco, Caracas',
  vehicle_class: 'suv' as const,
  scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  passengers: 2,
  passenger_name: 'John Doe',
  passenger_email: 'john@example.com',
  passenger_phone: '+584121234567',
  payment_method: 'stripe' as const,
  price_quoted_usd: 280,
}

describe('bookingRequestSchema', () => {
  it('accepts a valid booking', () => {
    const result = bookingRequestSchema.safeParse(validBooking)
    expect(result.success).toBe(true)
  })

  it('rejects invalid ride_type', () => {
    const result = bookingRequestSchema.safeParse({ ...validBooking, ride_type: 'helicopter' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = bookingRequestSchema.safeParse({ ...validBooking, passenger_email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects empty passenger name', () => {
    const result = bookingRequestSchema.safeParse({ ...validBooking, passenger_name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects negative price', () => {
    const result = bookingRequestSchema.safeParse({ ...validBooking, price_quoted_usd: -10 })
    expect(result.success).toBe(false)
  })

  it('rejects zero price', () => {
    const result = bookingRequestSchema.safeParse({ ...validBooking, price_quoted_usd: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects latitude out of range', () => {
    const result = bookingRequestSchema.safeParse({ ...validBooking, pickup_lat: 91 })
    expect(result.success).toBe(false)
  })

  it('rejects invalid payment method', () => {
    const result = bookingRequestSchema.safeParse({ ...validBooking, payment_method: 'bitcoin' })
    expect(result.success).toBe(false)
  })

  it('accepts optional waypoints', () => {
    const result = bookingRequestSchema.safeParse({
      ...validBooking,
      waypoints: [{ lat: 10.5, lng: -66.9, address: 'Stop 1' }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects waypoints with invalid coordinates', () => {
    const result = bookingRequestSchema.safeParse({
      ...validBooking,
      waypoints: [{ lat: 200, lng: -66.9, address: 'Stop 1' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects short phone numbers', () => {
    const result = bookingRequestSchema.safeParse({ ...validBooking, passenger_phone: '123' })
    expect(result.success).toBe(false)
  })

  it('accepts optional hours for intra_city', () => {
    const result = bookingRequestSchema.safeParse({
      ...validBooking,
      ride_type: 'intra_city',
      hours: 3,
    })
    expect(result.success).toBe(true)
  })
})
