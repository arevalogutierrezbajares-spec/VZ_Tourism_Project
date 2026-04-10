import { trackerPingSchema, isWithinVenezuela, isAnomalousPing } from '@/lib/ruta/tracker'

describe('tracker', () => {
  describe('trackerPingSchema', () => {
    it('accepts valid ping', () => {
      const result = trackerPingSchema.safeParse({
        device_id: 'device-001',
        lat: 10.5,
        lng: -66.9,
        speed: 60,
        heading: 180,
        timestamp: new Date().toISOString(),
      })
      expect(result.success).toBe(true)
    })

    it('rejects missing device_id', () => {
      const result = trackerPingSchema.safeParse({
        lat: 10.5,
        lng: -66.9,
        timestamp: new Date().toISOString(),
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid coordinates', () => {
      const result = trackerPingSchema.safeParse({
        device_id: 'device-001',
        lat: 200,
        lng: -66.9,
        timestamp: new Date().toISOString(),
      })
      expect(result.success).toBe(false)
    })

    it('allows optional speed and heading', () => {
      const result = trackerPingSchema.safeParse({
        device_id: 'device-001',
        lat: 10.5,
        lng: -66.9,
        timestamp: new Date().toISOString(),
      })
      expect(result.success).toBe(true)
    })
  })

  describe('isWithinVenezuela', () => {
    it('returns true for Caracas coordinates', () => {
      expect(isWithinVenezuela(10.5, -66.9)).toBe(true)
    })

    it('returns false for New York coordinates', () => {
      expect(isWithinVenezuela(40.7, -74.0)).toBe(false)
    })

    it('returns false for southern hemisphere below bbox', () => {
      expect(isWithinVenezuela(-5, -66.9)).toBe(false)
    })
  })

  describe('isAnomalousPing', () => {
    it('flags speed over 200 km/h', () => {
      const result = isAnomalousPing({ lat: 10.5, lng: -66.9, speed: 250 })
      expect(result.anomalous).toBe(true)
      expect(result.reason).toBe('speed_exceeds_200kmh')
    })

    it('does not flag normal speed', () => {
      const result = isAnomalousPing({ lat: 10.5, lng: -66.9, speed: 80 })
      expect(result.anomalous).toBe(false)
    })

    it('flags location jump over 50km', () => {
      const result = isAnomalousPing(
        { lat: 10.5, lng: -66.9 },
        { lat: 11.5, lng: -66.9, timestamp: new Date().toISOString() }
      )
      expect(result.anomalous).toBe(true)
      expect(result.reason).toBe('location_jump_over_50km')
    })

    it('does not flag small location change', () => {
      const result = isAnomalousPing(
        { lat: 10.500, lng: -66.900 },
        { lat: 10.501, lng: -66.901, timestamp: new Date().toISOString() }
      )
      expect(result.anomalous).toBe(false)
    })
  })
})
