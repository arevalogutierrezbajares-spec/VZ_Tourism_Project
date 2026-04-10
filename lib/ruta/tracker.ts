import { z } from 'zod'
import { createHash } from 'crypto'
import { VZ_BBOX } from '@/types/ruta'

export function hashTrackerKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export const trackerPingSchema = z.object({
  device_id: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed: z.number().min(0).optional(),
  heading: z.number().min(0).max(360).optional(),
  timestamp: z.string().datetime(),
})

export type TrackerPingInput = z.infer<typeof trackerPingSchema>

export function isWithinVenezuela(lat: number, lng: number): boolean {
  return (
    lat >= VZ_BBOX.minLat &&
    lat <= VZ_BBOX.maxLat &&
    lng >= VZ_BBOX.minLng &&
    lng <= VZ_BBOX.maxLng
  )
}

export function isAnomalousPing(
  current: { lat: number; lng: number; speed?: number },
  previous?: { lat: number; lng: number; timestamp: string }
): { anomalous: boolean; reason?: string } {
  // Speed > 200 km/h is suspicious for ground transport
  if (current.speed && current.speed > 200) {
    return { anomalous: true, reason: 'speed_exceeds_200kmh' }
  }

  if (previous) {
    // Calculate distance between consecutive pings
    const R = 6371 // Earth radius in km
    const dLat = ((current.lat - previous.lat) * Math.PI) / 180
    const dLng = ((current.lng - previous.lng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((previous.lat * Math.PI) / 180) *
        Math.cos((current.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    if (distance > 50) {
      return { anomalous: true, reason: 'location_jump_over_50km' }
    }
  }

  return { anomalous: false }
}
