'use client'

import { useRutaI18n } from '@/lib/ruta/i18n'

export interface LocationResult {
  address: string
  lat: number
  lng: number
}

const AIRPORTS: Array<{ code: string; name: string; city: string; lat: number; lng: number }> = [
  { code: 'CCS', name: 'Maiquetia International Airport', city: 'Caracas', lat: 10.6031, lng: -66.9906 },
  { code: 'PMV', name: 'Santiago Mariño Airport', city: 'Porlamar, Margarita', lat: 11.1494, lng: -63.9666 },
  { code: 'VLN', name: 'Arturo Michelena Airport', city: 'Valencia', lat: 10.1497, lng: -67.9284 },
  { code: 'BLA', name: 'José Antonio Anzoátegui Airport', city: 'Barcelona', lat: 10.1071, lng: -64.6892 },
  { code: 'MAR', name: 'La Chinita Airport', city: 'Maracaibo', lat: 10.5582, lng: -71.7279 },
  { code: 'MRD', name: 'Alberto Carnevalli Airport', city: 'Mérida', lat: 8.5822, lng: -71.1610 },
]

interface AirportSelectProps {
  value: LocationResult | null
  onChange: (location: LocationResult | null) => void
  label: string
}

export function AirportSelect({ value, onChange, label }: AirportSelectProps) {
  const { t } = useRutaI18n()

  return (
    <div>
      <label
        htmlFor="airport-select"
        className="block text-xs uppercase tracking-wider mb-2"
        style={{ color: '#999' }}
      >
        {label}
      </label>
      <select
        id="airport-select"
        value={value?.address || ''}
        onChange={(e) => {
          if (!e.target.value) {
            onChange(null)
            return
          }
          const airport = AIRPORTS.find(
            (a) => `${a.name} (${a.code})` === e.target.value
          )
          if (airport) {
            onChange({
              address: `${airport.name} (${airport.code})`,
              lat: airport.lat,
              lng: airport.lng,
            })
          }
        }}
        className="w-full py-3.5 px-4 text-sm outline-none appearance-none cursor-pointer"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${value ? 'rgba(201,169,110,0.4)' : 'rgba(255,255,255,0.1)'}`,
          color: value ? '#e8e8e8' : '#888',
        }}
      >
        <option value="">{t.booking.selectAirport}</option>
        {AIRPORTS.map((airport) => (
          <option key={airport.code} value={`${airport.name} (${airport.code})`}>
            {airport.code} — {airport.name}, {airport.city}
          </option>
        ))}
      </select>
    </div>
  )
}
