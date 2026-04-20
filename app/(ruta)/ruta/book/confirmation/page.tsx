'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { RutaI18nProvider } from '@/lib/ruta/i18n'
import { RutaNav } from '@/components/ruta/RutaNav'
import type { RutaRide } from '@/types/ruta'
import Link from 'next/link'

export default function BookingConfirmationPage() {
  return (
    <RutaI18nProvider>
      <Suspense fallback={<><RutaNav /><div className="min-h-screen flex items-center justify-center pt-20"><p style={{ color: '#888' }}>Loading...</p></div></>}>
        <BookingConfirmation />
      </Suspense>
    </RutaI18nProvider>
  )
}

function BookingConfirmation() {
  const searchParams = useSearchParams()
  const rideId = searchParams.get('ride_id')
  const token = searchParams.get('token')
  const [ride, setRide] = useState<RutaRide | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  useEffect(() => {
    if (!rideId) {
      setError('No ride ID provided. Please check your booking link.')
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
        setError('Failed to load ride details. Please try refreshing the page.')
        setLoading(false)
      })
  }, [rideId, token])

  const handleCancel = useCallback(async () => {
    if (!rideId || cancelling) return
    setCancelling(true)
    try {
      const params = new URLSearchParams()
      if (token) params.set('token', token)
      const res = await fetch(`/api/ruta/rides/${rideId}/cancel?${params}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by passenger from confirmation page' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to cancel ride')
      } else {
        // Refresh ride data
        const rideParams = new URLSearchParams()
        if (token) rideParams.set('token', token)
        const rideRes = await fetch(`/api/ruta/rides/${rideId}?${rideParams}`)
        if (rideRes.ok) {
          const data = await rideRes.json()
          setRide(data as RutaRide)
        }
      }
    } catch {
      setError('Failed to cancel ride. Please contact our ops team.')
    } finally {
      setCancelling(false)
      setShowCancelDialog(false)
    }
  }, [rideId, token, cancelling])

  if (loading) {
    return (
      <>
        <RutaNav />
        <div className="min-h-screen flex items-center justify-center pt-20">
          <div className="flex items-center gap-3">
            <span className="inline-block w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(201,169,110,0.3)', borderTopColor: '#c9a96e' }} aria-hidden="true" />
            <p style={{ color: '#888' }}>Loading ride details...</p>
          </div>
        </div>
      </>
    )
  }

  if (error || !ride) {
    return (
      <>
        <RutaNav />
        <div className="min-h-screen flex items-center justify-center pt-20">
          <div className="text-center max-w-md px-6">
            <div className="text-4xl mb-4" aria-hidden="true">!</div>
            <p className="text-lg mb-2 font-semibold" style={{ color: '#f87171' }}>
              Unable to Load Booking
            </p>
            <p className="text-sm mb-6" style={{ color: '#999' }}>
              {error || 'Ride not found. The booking may have expired or the link may be invalid.'}
            </p>
            <div className="flex flex-col items-center gap-3">
              <Link
                href="/ruta"
                className="text-sm underline focus:outline-none focus:ring-2 focus:ring-[#c9a96e] rounded-sm"
                style={{ color: '#c9a96e' }}
              >
                Return to RUTA
              </Link>
              <a
                href="https://wa.me/584121234567"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline"
                style={{ color: '#888' }}
              >
                Contact ops team via WhatsApp
              </a>
            </div>
          </div>
        </div>
      </>
    )
  }

  const isConfirmed = ['confirmed', 'assigned', 'driver_en_route', 'pickup', 'in_progress', 'completed'].includes(ride.status)
  const isPending = ride.status === 'pending_payment'
  const isCancelled = ride.status.startsWith('cancelled')
  const isExpired = ride.status === 'payment_expired'
  const canCancel = ['pending_payment', 'confirmed', 'assigned'].includes(ride.status)

  return (
    <>
      <RutaNav />
      <div className="min-h-screen pt-24 pb-16 px-6 md:px-16">
        <div className="max-w-2xl mx-auto">
          {/* Status Header */}
          <div className="text-center mb-12">
            {isConfirmed && (
              <>
                <div className="text-5xl mb-4" style={{ color: '#22c55e' }} aria-hidden="true">&#10003;</div>
                <h1 className="text-2xl font-semibold mb-2">Booking Confirmed</h1>
                <p className="text-sm" style={{ color: '#999' }}>
                  Your secure transfer is scheduled. We will send driver details via email and WhatsApp.
                </p>
              </>
            )}
            {isPending && ride.payment_method === 'zelle' && (
              <>
                <div className="text-5xl mb-4" style={{ color: '#ffb400' }} aria-hidden="true">&#8987;</div>
                <h1 className="text-2xl font-semibold mb-2">Awaiting Payment Verification</h1>
                <p className="text-sm" style={{ color: '#999' }}>
                  We are verifying your Zelle payment. This typically takes under 1 hour during business hours.
                </p>
              </>
            )}
            {isPending && ride.payment_method === 'stripe' && (
              <>
                <div className="text-5xl mb-4" style={{ color: '#ffb400' }} aria-hidden="true">&#8987;</div>
                <h1 className="text-2xl font-semibold mb-2">Payment Processing</h1>
                <p className="text-sm" style={{ color: '#999' }}>
                  Your payment is being processed. This page will update automatically.
                </p>
              </>
            )}
            {isCancelled && (
              <>
                <div className="text-5xl mb-4" style={{ color: '#ef4444' }} aria-hidden="true">&#10007;</div>
                <h1 className="text-2xl font-semibold mb-2">Booking Cancelled</h1>
                <p className="text-sm" style={{ color: '#999' }}>
                  {ride.cancellation_reason || 'This booking has been cancelled.'}
                </p>
              </>
            )}
            {isExpired && (
              <>
                <div className="text-5xl mb-4" style={{ color: '#666' }} aria-hidden="true">&#8987;</div>
                <h1 className="text-2xl font-semibold mb-2">Payment Expired</h1>
                <p className="text-sm" style={{ color: '#999' }}>
                  The payment window for this booking has expired. Please create a new booking.
                </p>
              </>
            )}
          </div>

          {/* Zelle Instructions (for pending Zelle payments) */}
          {isPending && ride.payment_method === 'zelle' && (
            <div
              className="p-6 mb-8"
              style={{
                background: 'rgba(255,180,0,0.05)',
                border: '1px solid rgba(255,180,0,0.2)',
              }}
            >
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#ffb400' }}>
                Zelle Payment Instructions
              </h3>
              <ol className="space-y-2 text-xs list-decimal pl-4" style={{ color: '#ccc' }}>
                <li>Open your Zelle app or banking app with Zelle</li>
                <li>Send <strong style={{ color: '#e8e8e8' }}>${Number(ride.price_quoted_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> to our account</li>
                <li>Use memo: <strong style={{ color: '#c9a96e' }}>RUTA-{ride.id.slice(0, 8).toUpperCase()}</strong></li>
                <li>Our team will verify and confirm your booking</li>
              </ol>
              <p className="text-[10px] mt-3" style={{ color: '#666' }}>
                Payment must be received within 4 hours or the booking will expire.
              </p>
            </div>
          )}

          {/* Ride Details Card */}
          <div
            className="p-6 sm:p-8 mb-8"
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
              <DetailRow label="Price" value={`$${Number(ride.price_quoted_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`} />
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

          {/* Cancellation */}
          {canCancel && (
            <div className="mb-8">
              {!showCancelDialog ? (
                <button
                  onClick={() => setShowCancelDialog(true)}
                  className="text-xs underline cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400 rounded-sm"
                  style={{ color: '#888' }}
                >
                  Cancel this booking
                </button>
              ) : (
                <div
                  className="p-6"
                  role="alertdialog"
                  aria-labelledby="cancel-dialog-title"
                  aria-describedby="cancel-dialog-desc"
                  style={{
                    background: 'rgba(239,68,68,0.05)',
                    border: '1px solid rgba(239,68,68,0.2)',
                  }}
                >
                  <h3 id="cancel-dialog-title" className="text-sm font-semibold mb-2" style={{ color: '#f87171' }}>
                    Cancel this booking?
                  </h3>
                  <p id="cancel-dialog-desc" className="text-xs mb-4" style={{ color: '#999' }}>
                    {(() => {
                      const scheduled = new Date(ride.scheduled_at)
                      const hoursUntil = (scheduled.getTime() - Date.now()) / (1000 * 60 * 60)
                      if (hoursUntil > 24) return 'More than 24 hours before pickup: 95% refund (5% processing fee).'
                      if (hoursUntil >= 2) return '2-24 hours before pickup: 50% refund.'
                      return 'Less than 2 hours before pickup: no refund.'
                    })()}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wider disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400"
                      style={{ background: '#ef4444', color: '#fff' }}
                    >
                      {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
                    </button>
                    <button
                      onClick={() => setShowCancelDialog(false)}
                      className="px-4 py-2 text-xs uppercase tracking-wider cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#c9a96e]"
                      style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}
                    >
                      Keep Booking
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Contact */}
          <div className="text-center text-sm" style={{ color: '#888' }}>
            Questions?{' '}
            <a
              href="https://wa.me/584121234567"
              target="_blank"
              rel="noopener noreferrer"
              className="underline focus:outline-none focus:ring-2 focus:ring-[#c9a96e] rounded-sm"
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
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
      <span className="text-xs uppercase tracking-wider flex-shrink-0" style={{ color: '#888' }}>
        {label}
      </span>
      <span className="text-sm sm:text-right sm:max-w-[60%]">{value}</span>
    </div>
  )
}
