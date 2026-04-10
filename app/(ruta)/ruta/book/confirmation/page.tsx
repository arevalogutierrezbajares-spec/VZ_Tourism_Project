'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { RutaNav } from '@/components/ruta/RutaNav'
import type { RutaRide } from '@/types/ruta'
import Link from 'next/link'

export default function BookingConfirmation() {
  const searchParams = useSearchParams()
  const rideId = searchParams.get('ride_id')
  const token = searchParams.get('token')
  const [ride, setRide] = useState<RutaRide | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!rideId) {
      setError('No ride ID provided')
      setLoading(false)
      return
    }

    const params = new URLSearchParams()
    if (token) params.set('token', token)

    fetch(`/api/ruta/rides/${rideId}?${params}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setError(data.error || 'Ride not found')
        } else {
          const data = await res.json()
          setRide(data as RutaRide)
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load ride details')
        setLoading(false)
      })
  }, [rideId, token])

  if (loading) {
    return (
      <>
        <RutaNav />
        <div className="min-h-screen flex items-center justify-center pt-20">
          <p style={{ color: '#888' }}>Loading ride details...</p>
        </div>
      </>
    )
  }

  if (error || !ride) {
    return (
      <>
        <RutaNav />
        <div className="min-h-screen flex items-center justify-center pt-20">
          <div className="text-center">
            <p className="text-lg mb-4" style={{ color: '#ef4444' }}>
              {error || 'Ride not found'}
            </p>
            <Link href="/ruta" className="text-sm underline" style={{ color: '#c9a96e' }}>
              Return to RUTA
            </Link>
          </div>
        </div>
      </>
    )
  }

  const isConfirmed = ['confirmed', 'assigned', 'driver_en_route', 'pickup', 'in_progress', 'completed'].includes(ride.status)
  const isPending = ride.status === 'pending_payment'
  const isCancelled = ride.status.startsWith('cancelled')

  return (
    <>
      <RutaNav />
      <div className="min-h-screen pt-24 px-6 md:px-16">
        <div className="max-w-2xl mx-auto">
          {/* Status Header */}
          <div className="text-center mb-12">
            {isConfirmed && (
              <>
                <div className="text-5xl mb-4">&#10003;</div>
                <h1 className="text-2xl font-semibold mb-2">Booking Confirmed</h1>
                <p className="text-sm" style={{ color: '#999' }}>
                  Your secure transfer is scheduled. We'll send driver details via email and WhatsApp.
                </p>
              </>
            )}
            {isPending && ride.payment_method === 'zelle' && (
              <>
                <div className="text-5xl mb-4">&#8987;</div>
                <h1 className="text-2xl font-semibold mb-2">Awaiting Payment Verification</h1>
                <p className="text-sm" style={{ color: '#999' }}>
                  We're verifying your Zelle payment. This typically takes under 1 hour during business hours.
                </p>
              </>
            )}
            {isPending && ride.payment_method === 'stripe' && (
              <>
                <div className="text-5xl mb-4">&#8987;</div>
                <h1 className="text-2xl font-semibold mb-2">Payment Processing</h1>
                <p className="text-sm" style={{ color: '#999' }}>
                  Your payment is being processed. This page will update automatically.
                </p>
              </>
            )}
            {isCancelled && (
              <>
                <div className="text-5xl mb-4">&#10007;</div>
                <h1 className="text-2xl font-semibold mb-2">Booking Cancelled</h1>
                <p className="text-sm" style={{ color: '#999' }}>
                  {ride.cancellation_reason || 'This booking has been cancelled.'}
                </p>
              </>
            )}
          </div>

          {/* Ride Details Card */}
          <div
            className="p-8 mb-8"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <h2
              className="text-xs uppercase tracking-widest mb-6"
              style={{ color: '#c9a96e' }}
            >
              Transfer Details
            </h2>

            <div className="space-y-4">
              <DetailRow label="Service" value={ride.ride_type.replace('_', ' ')} />
              <DetailRow label="Pickup" value={ride.pickup_address} />
              <DetailRow label="Destination" value={ride.dropoff_address} />
              <DetailRow
                label="Scheduled"
                value={new Date(ride.scheduled_at).toLocaleString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'America/Caracas',
                }) + ' (VET)'}
              />
              <DetailRow label="Price" value={`$${Number(ride.price_quoted_usd).toFixed(2)} USD`} />
              <DetailRow label="Payment" value={ride.payment_method === 'stripe' ? 'Credit Card' : 'Zelle'} />
              <DetailRow label="Status" value={ride.status.replace(/_/g, ' ').toUpperCase()} />
            </div>
          </div>

          {/* What's Next */}
          {isConfirmed && ride.status === 'confirmed' && (
            <div
              className="p-6 mb-8"
              style={{
                background: 'rgba(201,169,110,0.05)',
                border: '1px solid rgba(201,169,110,0.15)',
              }}
            >
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#c9a96e' }}>
                What happens next
              </h3>
              <ul className="space-y-2 text-xs" style={{ color: '#999' }}>
                <li>Our dispatch team will assign a driver and vehicle to your ride.</li>
                <li>Save this page for reference. You can check your ride status here anytime.</li>
                <li>For updates or questions, contact our ops team via WhatsApp below.</li>
              </ul>
            </div>
          )}

          {/* Contact */}
          <div className="text-center text-sm" style={{ color: '#666' }}>
            Questions?{' '}
            <a
              href="https://wa.me/584121234567"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: '#c9a96e' }}
            >
              WhatsApp our ops team
            </a>
          </div>
        </div>
      </div>
    </>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start">
      <span className="text-xs uppercase tracking-wider" style={{ color: '#666' }}>
        {label}
      </span>
      <span className="text-sm text-right max-w-[60%]">{value}</span>
    </div>
  )
}
