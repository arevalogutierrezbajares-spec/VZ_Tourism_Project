'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { RutaRideType, RutaVehicleClass, RutaPaymentMethod } from '@/types/ruta'
import { RUTA_MIN_LEAD_TIMES } from '@/types/ruta'
import { AirportSelect, type LocationResult } from './AirportSelect'
import { LocationInput } from './LocationInput'

interface BookingFormProps {
  activeService: RutaRideType
  onServiceChange: (service: RutaRideType) => void
}

const SERVICE_TABS: { type: RutaRideType; label: string }[] = [
  { type: 'airport', label: 'Airport' },
  { type: 'inter_city', label: 'Inter-City' },
  { type: 'intra_city', label: 'Intra-City' },
]

const VEHICLE_OPTIONS: { value: RutaVehicleClass; label: string }[] = [
  { value: 'sedan', label: 'Armored Sedan' },
  { value: 'suv', label: 'Armored SUV' },
  { value: 'van', label: 'Executive Van' },
]

interface QuoteResult {
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
  expires_at: string
}

export function BookingForm({ activeService, onServiceChange }: BookingFormProps) {
  const router = useRouter()
  const [pickupLocation, setPickupLocation] = useState<LocationResult | null>(null)
  const [dropoffLocation, setDropoffLocation] = useState<LocationResult | null>(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [passengers, setPassengers] = useState('1')
  const [vehicleClass, setVehicleClass] = useState<RutaVehicleClass>('suv')
  const [quote, setQuote] = useState<QuoteResult | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)

  // Checkout step state
  const [showCheckout, setShowCheckout] = useState(false)
  const [passengerName, setPassengerName] = useState('')
  const [passengerEmail, setPassengerEmail] = useState('')
  const [passengerPhone, setPassengerPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<RutaPaymentMethod>('stripe')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const getMinDateTime = useCallback(() => {
    const leadMinutes = RUTA_MIN_LEAD_TIMES[activeService]
    const min = new Date(Date.now() + leadMinutes * 60 * 1000)
    return min.toISOString().slice(0, 16)
  }, [activeService])

  function handleServiceChange(service: RutaRideType) {
    onServiceChange(service)
    setPickupLocation(null)
    setDropoffLocation(null)
    setQuote(null)
    setQuoteError(null)
  }

  const handleGetQuote = async () => {
    const missing: string[] = []
    if (!pickupLocation) missing.push('pickup location')
    if (!dropoffLocation) missing.push('destination')
    if (!date) missing.push('date')
    if (!time) missing.push('time')
    if (missing.length > 0) {
      setQuoteError(`Please fill in: ${missing.join(', ')}.`)
      return
    }

    setQuoteLoading(true)
    setQuoteError(null)
    setQuote(null)

    try {
      if (!pickupLocation || !dropoffLocation) return
      const params = new URLSearchParams({
        ride_type: activeService,
        pickup_lat: String(pickupLocation.lat),
        pickup_lng: String(pickupLocation.lng),
        pickup_address: pickupLocation.address,
        dropoff_lat: String(dropoffLocation.lat),
        dropoff_lng: String(dropoffLocation.lng),
        dropoff_address: dropoffLocation.address,
        vehicle_class: vehicleClass,
        scheduled_at: new Date(`${date}T${time}:00-04:00`).toISOString(),
        passengers,
      })

      const res = await fetch(`/api/ruta/quote?${params}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to get quote')
      }

      const data = await res.json()
      setQuote(data)
    } catch (err) {
      setQuoteError(
        err instanceof Error
          ? err.message
          : "We couldn't calculate your price right now. Please try again or contact us via WhatsApp for an instant quote."
      )
    } finally {
      setQuoteLoading(false)
    }
  }

  const handleCheckout = async () => {
    if (!passengerName.trim() || !passengerEmail.trim() || !passengerPhone.trim()) {
      setCheckoutError('Please fill in all passenger details.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(passengerEmail)) {
      setCheckoutError('Please enter a valid email address.')
      return
    }
    if (!quote || !pickupLocation || !dropoffLocation) return

    setCheckoutLoading(true)
    setCheckoutError(null)

    try {
      const res = await fetch('/api/ruta/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ride_type: activeService,
          pickup_lat: pickupLocation.lat,
          pickup_lng: pickupLocation.lng,
          pickup_address: pickupLocation.address,
          dropoff_lat: dropoffLocation.lat,
          dropoff_lng: dropoffLocation.lng,
          dropoff_address: dropoffLocation.address,
          vehicle_class: vehicleClass,
          scheduled_at: new Date(`${date}T${time}:00-04:00`).toISOString(),
          passengers: Number(passengers),
          passenger_name: passengerName.trim(),
          passenger_email: passengerEmail.trim(),
          passenger_phone: passengerPhone.trim(),
          payment_method: paymentMethod,
          price_quoted_usd: quote.price_usd,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Checkout failed')
      }

      if (data.checkout_url) {
        window.location.href = data.checkout_url
      } else {
        router.push(`/ruta/book/confirmation?ride_id=${data.ride_id}&token=${data.access_token}`)
      }
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      )
    } finally {
      setCheckoutLoading(false)
    }
  }

  // Determine which geocoding types to use based on service
  // Use 'all' for Venezuela since Mapbox has limited POI/address coverage there
  const pickupTypes = activeService === 'inter_city' ? 'place,locality' : 'all'
  const dropoffTypes = activeService === 'inter_city' ? 'place,locality' : 'all'

  return (
    <div
      id="book"
      className="p-6 md:p-10"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <h2
        className="text-xs uppercase tracking-widest mb-6"
        style={{ color: '#c9a96e' }}
      >
        Book Your Transfer
      </h2>

      {/* Service Tabs */}
      <div
        className="grid grid-cols-3 gap-2 mb-6"
        role="tablist"
        aria-label="Service type"
      >
        {SERVICE_TABS.map((tab) => (
          <button
            key={tab.type}
            role="tab"
            aria-selected={activeService === tab.type}
            onClick={() => handleServiceChange(tab.type)}
            className="py-3 px-2 text-center text-xs uppercase tracking-wider transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black"
            style={{
              background:
                activeService === tab.type
                  ? 'rgba(201,169,110,0.05)'
                  : 'rgba(255,255,255,0.02)',
              border: `1px solid ${
                activeService === tab.type
                  ? '#c9a96e'
                  : 'rgba(255,255,255,0.08)'
              }`,
              color: activeService === tab.type ? '#c9a96e' : '#888',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pickup Location */}
      <div className="mb-4">
        {activeService === 'airport' ? (
          <AirportSelect
            value={pickupLocation}
            onChange={setPickupLocation}
            label="Pickup Airport"
          />
        ) : (
          <LocationInput
            value={pickupLocation}
            onChange={setPickupLocation}
            label="Pickup Location"
            placeholder={
              activeService === 'inter_city'
                ? 'City name (e.g., Caracas, Valencia)'
                : 'Address, hotel, or landmark'
            }
            types={pickupTypes}
          />
        )}
      </div>

      {/* Dropoff Location */}
      <div className="mb-4">
        <LocationInput
          value={dropoffLocation}
          onChange={setDropoffLocation}
          label="Destination"
          placeholder={
            activeService === 'airport'
              ? 'Hotel, address, or landmark'
              : activeService === 'inter_city'
                ? 'Destination city (e.g., Merida, Maracaibo)'
                : 'Address, hotel, or landmark'
          }
          types={dropoffTypes}
        />
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="relative">
          <label
            htmlFor="ruta-date"
            className="block text-xs uppercase tracking-wider mb-2"
            style={{ color: '#999' }}
          >
            Date {date && <span style={{ color: '#c9a96e' }}>&#10003;</span>}
          </label>
          {/* Visible placeholder layer when empty */}
          {!date && (
            <div
              className="absolute left-0 right-0 py-3.5 px-4 text-sm pointer-events-none"
              style={{ color: '#666', top: '28px' }}
            >
              Select date
            </div>
          )}
          <input
            id="ruta-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full py-3.5 px-4 text-sm outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${date ? 'rgba(201,169,110,0.4)' : 'rgba(255,255,255,0.1)'}`,
              color: date ? '#e8e8e8' : 'transparent',
              colorScheme: 'dark',
            }}
          />
        </div>
        <div className="relative">
          <label
            htmlFor="ruta-time"
            className="block text-xs uppercase tracking-wider mb-2"
            style={{ color: '#999' }}
          >
            Time (VET, UTC-4) {time && <span style={{ color: '#c9a96e' }}>&#10003;</span>}
          </label>
          {/* Visible placeholder layer when empty */}
          {!time && (
            <div
              className="absolute left-0 right-0 py-3.5 px-4 text-sm pointer-events-none"
              style={{ color: '#666', top: '28px' }}
            >
              Select time
            </div>
          )}
          <input
            id="ruta-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full py-3.5 px-4 text-sm outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${time ? 'rgba(201,169,110,0.4)' : 'rgba(255,255,255,0.1)'}`,
              color: time ? '#e8e8e8' : 'transparent',
              colorScheme: 'dark',
            }}
          />
        </div>
      </div>

      {/* Passengers & Vehicle Class */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label
            htmlFor="passengers"
            className="block text-xs uppercase tracking-wider mb-2"
            style={{ color: '#999' }}
          >
            Passengers
          </label>
          <select
            id="passengers"
            value={passengers}
            onChange={(e) => setPassengers(e.target.value)}
            className="w-full py-3.5 px-4 text-sm outline-none appearance-none cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#e8e8e8',
            }}
          >
            <option value="1">1 Passenger</option>
            <option value="2">2 Passengers</option>
            <option value="3">3 Passengers</option>
            <option value="4">4 Passengers</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="vehicleClass"
            className="block text-xs uppercase tracking-wider mb-2"
            style={{ color: '#999' }}
          >
            Vehicle
          </label>
          <select
            id="vehicleClass"
            value={vehicleClass}
            onChange={(e) => {
              setVehicleClass(e.target.value as RutaVehicleClass)
              setQuote(null)
            }}
            className="w-full py-3.5 px-4 text-sm outline-none appearance-none cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#e8e8e8',
            }}
          >
            {VEHICLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Get Quote Button */}
      <button
        onClick={handleGetQuote}
        disabled={quoteLoading || !pickupLocation || !dropoffLocation}
        className="w-full py-4 text-sm font-bold uppercase tracking-widest transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: '#c9a96e',
          color: '#0a0a0a',
        }}
      >
        {quoteLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Calculating...
          </span>
        ) : (
          'Get Instant Quote'
        )}
      </button>

      {/* Selected locations indicator */}
      {(pickupLocation || dropoffLocation) && (
        <div className="mt-3 flex gap-4 text-[10px]" style={{ color: '#555' }}>
          {pickupLocation && (
            <span>From: {pickupLocation.lat.toFixed(4)}, {pickupLocation.lng.toFixed(4)}</span>
          )}
          {dropoffLocation && (
            <span>To: {dropoffLocation.lat.toFixed(4)}, {dropoffLocation.lng.toFixed(4)}</span>
          )}
        </div>
      )}

      {/* Quote Result */}
      {quote && (
        <div
          className="mt-6 p-6"
          style={{
            background: 'rgba(201,169,110,0.05)',
            border: '1px solid rgba(201,169,110,0.2)',
          }}
          aria-live="polite"
        >
          <div className="flex justify-between items-baseline mb-4">
            <span className="text-xs uppercase tracking-wider" style={{ color: '#999' }}>
              Your Quote
            </span>
            <span className="text-xs" style={{ color: '#666' }}>
              Valid for 15 min
            </span>
          </div>
          <div className="text-4xl font-bold mb-4" style={{ color: '#c9a96e' }}>
            ${quote.price_usd.toFixed(2)} <span className="text-sm font-normal" style={{ color: '#888' }}>USD</span>
          </div>
          {/* Breakdown */}
          <div className="space-y-1 text-xs mb-6" style={{ color: '#888' }}>
            {quote.breakdown.base_fare > 0 && (
              <div className="flex justify-between">
                <span>Base fare</span>
                <span>${quote.breakdown.base_fare.toFixed(2)}</span>
              </div>
            )}
            {quote.breakdown.distance_charge > 0 && (
              <div className="flex justify-between">
                <span>Distance ({quote.distance_km} km)</span>
                <span>${quote.breakdown.distance_charge.toFixed(2)}</span>
              </div>
            )}
            {quote.breakdown.time_charge > 0 && (
              <div className="flex justify-between">
                <span>Time ({quote.duration_minutes} min)</span>
                <span>${quote.breakdown.time_charge.toFixed(2)}</span>
              </div>
            )}
            {quote.breakdown.multiplier !== 1 && (
              <div className="flex justify-between">
                <span>{quote.breakdown.multiplier_name} ({quote.breakdown.multiplier}x)</span>
                <span>applied</span>
              </div>
            )}
          </div>
          {!showCheckout ? (
            <button
              onClick={() => setShowCheckout(true)}
              className="w-full py-4 text-sm font-bold uppercase tracking-widest transition-opacity hover:opacity-90"
              style={{ background: '#c9a96e', color: '#0a0a0a' }}
            >
              Book Now - ${quote.price_usd.toFixed(2)}
            </button>
          ) : (
            <div className="space-y-4 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xs uppercase tracking-wider" style={{ color: '#999' }}>
                Passenger Details
              </p>
              <input
                type="text"
                placeholder="Full Name *"
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
                className="w-full py-3 px-4 text-sm outline-none"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e8e8e8',
                }}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="email"
                  placeholder="Email *"
                  value={passengerEmail}
                  onChange={(e) => setPassengerEmail(e.target.value)}
                  className="w-full py-3 px-4 text-sm outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#e8e8e8',
                  }}
                />
                <input
                  type="tel"
                  placeholder="Phone *"
                  value={passengerPhone}
                  onChange={(e) => setPassengerPhone(e.target.value)}
                  className="w-full py-3 px-4 text-sm outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#e8e8e8',
                  }}
                />
              </div>

              <p className="text-xs uppercase tracking-wider mt-2" style={{ color: '#999' }}>
                Payment Method
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(['stripe', 'zelle'] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className="py-3 px-4 text-xs uppercase tracking-wider text-center transition-all"
                    style={{
                      background: paymentMethod === method ? 'rgba(201,169,110,0.05)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${paymentMethod === method ? '#c9a96e' : 'rgba(255,255,255,0.08)'}`,
                      color: paymentMethod === method ? '#c9a96e' : '#888',
                    }}
                  >
                    {method === 'stripe' ? 'Credit Card' : 'Zelle'}
                  </button>
                ))}
              </div>

              {checkoutError && (
                <div className="p-3 text-xs" role="alert" style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#f87171',
                }}>
                  {checkoutError}
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="w-full py-4 text-sm font-bold uppercase tracking-widest transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ background: '#c9a96e', color: '#0a0a0a' }}
              >
                {checkoutLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  `Confirm & Pay $${quote.price_usd.toFixed(2)}`
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quote Error */}
      {quoteError && (
        <div
          className="mt-4 p-4 text-sm"
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#f87171',
          }}
          role="alert"
        >
          {quoteError}
          <div className="mt-2">
            <a
              href="https://wa.me/584121234567"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline text-xs"
              style={{ color: '#c9a96e' }}
            >
              Contact our ops team for a manual quote
            </a>
          </div>
        </div>
      )}

      {/* Lead time notice */}
      <p className="mt-4 text-xs text-center" style={{ color: '#555' }}>
        {activeService === 'airport' && 'Minimum 2 hours before pickup.'}
        {activeService === 'inter_city' && 'Minimum 4 hours before pickup.'}
        {activeService === 'intra_city' && 'Minimum 1 hour before pickup.'}
        {' '}
        <a
          href="https://wa.me/584121234567"
          className="underline"
          style={{ color: '#c9a96e' }}
        >
          Need sooner? Call us.
        </a>
      </p>
    </div>
  )
}
