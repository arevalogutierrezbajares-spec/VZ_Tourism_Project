'use client'

import { useState, useRef, useEffect, useCallback, useId } from 'react'
import type { LocationResult } from './AirportSelect'
import { useRutaI18n } from '@/lib/ruta/i18n'

interface GeoResult {
  id: string
  place_name: string
  main_text?: string
  secondary_text?: string
  lat: number
  lng: number
  context: string
}

interface LocationInputProps {
  value: LocationResult | null
  onChange: (location: LocationResult | null) => void
  label: string
  placeholder: string
  /** Mapbox geocoding types: 'address,poi' for street-level, 'place,locality' for city-level */
  types?: string
}

export function LocationInput({
  value,
  onChange,
  label,
  placeholder,
  types = 'address,poi',
}: LocationInputProps) {
  const { t } = useRutaI18n()
  const [query, setQuery] = useState(value?.address || '')
  const [results, setResults] = useState<GeoResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [noResults, setNoResults] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputId = useId()

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Sync external value changes
  useEffect(() => {
    if (value) {
      setQuery(value.address)
    }
  }, [value])

  const search = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setResults([])
        setNoResults(false)
        setOpen(false)
        return
      }

      setLoading(true)
      setNoResults(false)

      try {
        const params = new URLSearchParams({ q, types, country: 'VE' })
        const res = await fetch(`/api/ruta/geocode?${params}`)
        if (!res.ok) throw new Error('Geocode failed')
        const data = await res.json()
        const items: GeoResult[] = data.results || []
        setResults(items)
        setNoResults(items.length === 0)
        setOpen(true)
      } catch {
        setResults([])
        setNoResults(true)
        setOpen(true)
      } finally {
        setLoading(false)
      }
    },
    [types]
  )

  function handleInputChange(val: string) {
    setQuery(val)
    // Clear selected location if user edits the text
    if (value) {
      onChange(null)
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 300)
  }

  function handleSelect(result: GeoResult) {
    const loc: LocationResult = {
      address: result.place_name,
      lat: result.lat,
      lng: result.lng,
    }
    onChange(loc)
    setQuery(result.place_name)
    setOpen(false)
    setResults([])
  }

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor={inputId}
        className="block text-xs uppercase tracking-wider mb-2"
        style={{ color: '#999' }}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true)
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full py-3.5 px-4 text-sm outline-none transition-colors"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${value ? 'rgba(201,169,110,0.4)' : 'rgba(255,255,255,0.1)'}`,
            color: '#e8e8e8',
          }}
        />
        {/* Loading indicator */}
        {loading && (
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 rounded-full animate-spin"
            style={{
              borderColor: 'rgba(201,169,110,0.3)',
              borderTopColor: '#c9a96e',
            }}
          />
        )}
        {/* Selected checkmark */}
        {value && !loading && (
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
            style={{ color: '#c9a96e' }}
          >
            &#10003;
          </div>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto"
          style={{
            background: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          {noResults && (
            <div className="px-4 py-3 text-sm" style={{ color: '#888' }}>
              {t.booking.noLocations}
            </div>
          )}
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleSelect(result)}
              className="w-full text-left px-4 py-3 transition-colors hover:bg-white/5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="text-sm" style={{ color: '#e8e8e8' }}>
                {result.main_text || result.place_name.split(',')[0]}
              </div>
              {(result.secondary_text || result.context) && (
                <div className="text-xs mt-0.5" style={{ color: '#666' }}>
                  {result.secondary_text || result.context}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
