'use client'

import { useEffect, useState, useCallback } from 'react'
import type { RutaRideWithDetails } from '@/types/ruta'

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending_payment: { bg: 'rgba(255,180,0,0.1)', text: '#ffb400', border: 'rgba(255,180,0,0.2)' },
  confirmed: { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6', border: 'rgba(59,130,246,0.2)' },
  assigned: { bg: 'rgba(0,180,100,0.1)', text: '#00b464', border: 'rgba(0,180,100,0.2)' },
  driver_en_route: { bg: 'rgba(100,150,255,0.1)', text: '#6496ff', border: 'rgba(100,150,255,0.2)' },
  pickup: { bg: 'rgba(168,85,247,0.1)', text: '#a855f7', border: 'rgba(168,85,247,0.2)' },
  in_progress: { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', border: 'rgba(34,197,94,0.2)' },
  completed: { bg: 'rgba(100,100,100,0.1)', text: '#888', border: 'rgba(100,100,100,0.2)' },
  cancelled_by_passenger: { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.2)' },
  cancelled_by_ops: { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.2)' },
  payment_expired: { bg: 'rgba(100,100,100,0.1)', text: '#666', border: 'rgba(100,100,100,0.2)' },
}

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.confirmed
  return (
    <span
      className="text-[10px] uppercase tracking-wider px-2 py-1 inline-block"
      style={{
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
      }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Caracas',
  })
}

export default function DispatchPage() {
  const [rides, setRides] = useState<RutaRideWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRide, setSelectedRide] = useState<string | null>(null)
  const [drivers, setDrivers] = useState<Array<{ id: string; full_name: string; status: string }>>([])
  const [vehicles, setVehicles] = useState<Array<{ id: string; plate_number: string; vehicle_class: string }>>([])
  const [filter, setFilter] = useState<'active' | 'all'>('active')
  const [inlineToast, setInlineToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [secondsAgo, setSecondsAgo] = useState(0)

  function showToast(msg: string, type: 'error' | 'success' = 'error') {
    setInlineToast({ msg, type })
    setTimeout(() => setInlineToast(null), 4000)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/ruta/dispatch?filter=${filter}`)
      if (!res.ok) throw new Error('Failed to fetch dispatch data')
      const data = await res.json()
      setRides((data.rides as RutaRideWithDetails[]) || [])
      setDrivers(data.drivers || [])
      setVehicles(data.vehicles || [])
      setLastUpdated(new Date())
      setSecondsAgo(0)
    } catch (err) {
      console.error('Dispatch load error:', err)
    }
    setLoading(false)
  }, [filter])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 30-second polling interval (P0-RTA-002)
  useEffect(() => {
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [loadData])

  // "Last updated X seconds ago" ticker
  useEffect(() => {
    const ticker = setInterval(() => {
      setSecondsAgo(Math.round((Date.now() - lastUpdated.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(ticker)
  }, [lastUpdated])

  async function assignDriver(rideId: string, driverId: string, vehicleId: string) {
    const res = await fetch('/api/ruta/dispatch/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ride_id: rideId, driver_id: driverId, vehicle_id: vehicleId }),
    })
    if (!res.ok) {
      const data = await res.json()
      showToast(`Failed to assign: ${data.error}`)
      return
    }
    showToast('Driver assigned successfully', 'success')
    loadData()
    setSelectedRide(null)
  }

  async function confirmZelle(rideId: string) {
    const res = await fetch('/api/ruta/dispatch/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ride_id: rideId, new_status: 'confirmed' }),
    })
    if (!res.ok) {
      const data = await res.json()
      showToast(`Failed: ${data.error}`)
      return
    }
    showToast('Payment confirmed', 'success')
    loadData()
  }

  const selected = rides.find((r) => r.id === selectedRide)

  return (
    <div className="flex h-[calc(100vh-60px)]">
      {/* Inline toast (replaces alert/confirm — P0-RTA-001) */}
      {inlineToast && (
        <div
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium"
          role="alert"
          style={{
            background: inlineToast.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            border: `1px solid ${inlineToast.type === 'success' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
            color: inlineToast.type === 'success' ? '#22c55e' : '#f87171',
          }}
        >
          {inlineToast.msg}
        </div>
      )}

      {/* Left: Ride Queue */}
      <div
        className="w-96 flex-shrink-0 overflow-y-auto"
        style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <h2
              className="text-xs uppercase tracking-widest"
              style={{ color: '#c9a96e' }}
            >
              Rides ({rides.length})
            </h2>
            <p className="text-[10px] mt-0.5" style={{ color: '#555' }}>
              Updated {secondsAgo}s ago
            </p>
          </div>
          <div className="flex gap-2" role="tablist" aria-label="Ride filter">
            {(['active', 'all'] as const).map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className="text-[10px] uppercase tracking-wider px-3 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#c9a96e]"
                style={{
                  background:
                    filter === f
                      ? 'rgba(201,169,110,0.1)'
                      : 'transparent',
                  border: `1px solid ${
                    filter === f
                      ? 'rgba(201,169,110,0.3)'
                      : 'rgba(255,255,255,0.05)'
                  }`,
                  color: filter === f ? '#c9a96e' : '#888',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: '#666' }}>
            Loading rides...
          </div>
        ) : rides.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm mb-2" style={{ color: '#666' }}>
              No {filter === 'active' ? 'active ' : ''}rides
            </p>
            <p className="text-xs" style={{ color: '#777' }}>
              Rides will appear here when passengers book.
            </p>
          </div>
        ) : (
          <div>
            {rides.map((ride) => (
              <button
                key={ride.id}
                onClick={() => setSelectedRide(ride.id)}
                className="w-full text-left p-4 transition-colors hover:bg-white/[0.02] cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#c9a96e]"
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  background:
                    selectedRide === ride.id
                      ? 'rgba(201,169,110,0.05)'
                      : 'transparent',
                }}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-medium truncate max-w-[200px]">
                    {ride.pickup_address}
                  </span>
                  <span className="text-[10px]" style={{ color: '#666' }}>
                    {ride.ride_type.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-xs mb-2 truncate" style={{ color: '#888' }}>
                  → {ride.dropoff_address}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: '#666' }}>
                    {formatDate(ride.scheduled_at)} · {ride.passenger_name}
                  </span>
                  <StatusBadge status={ride.status} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Detail / Map */}
      <div className="flex-1 flex flex-col">
        {selected ? (
          <RideDetail
            ride={selected}
            drivers={drivers}
            vehicles={vehicles}
            onAssign={assignDriver}
            onConfirmZelle={confirmZelle}
            onClose={() => setSelectedRide(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm" style={{ color: '#777' }}>
              Select a ride to view details
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function RideDetail({
  ride,
  drivers,
  vehicles,
  onAssign,
  onConfirmZelle,
  onClose,
}: {
  ride: RutaRideWithDetails
  drivers: Array<{ id: string; full_name: string; status: string }>
  vehicles: Array<{ id: string; plate_number: string; vehicle_class: string }>
  onAssign: (rideId: string, driverId: string, vehicleId: string) => void
  onConfirmZelle: (rideId: string) => void
  onClose: () => void
}) {
  const [selectedDriver, setSelectedDriver] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState('')

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-semibold mb-1">{ride.pickup_address}</h2>
          <p className="text-sm" style={{ color: '#888' }}>
            → {ride.dropoff_address}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close ride details"
          className="text-xs px-3 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#c9a96e]"
          style={{ color: '#888', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <InfoBlock label="Status" value={ride.status.replace(/_/g, ' ')} />
        <InfoBlock label="Type" value={ride.ride_type.replace('_', ' ')} />
        <InfoBlock label="Pickup" value={formatDate(ride.scheduled_at)} />
        <InfoBlock label="Price" value={`$${Number(ride.price_quoted_usd).toFixed(2)}`} />
        <InfoBlock label="Passenger" value={ride.passenger_name} />
        <InfoBlock label="Phone" value={ride.passenger_phone} />
        <InfoBlock label="Email" value={ride.passenger_email} />
        <InfoBlock label="Payment" value={ride.payment_method} />
      </div>

      {/* Zelle Confirmation */}
      {ride.status === 'pending_payment' && ride.payment_method === 'zelle' && (
        <div
          className="p-6 mb-8"
          style={{
            background: 'rgba(255,180,0,0.05)',
            border: '1px solid rgba(255,180,0,0.2)',
          }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#ffb400' }}>
            Zelle Payment Pending
          </h3>
          <p className="text-xs mb-2" style={{ color: '#999' }}>
            Confirmation code: <strong style={{ color: '#e8e8e8' }}>{ride.zelle_confirmation_code || 'Not provided'}</strong>
          </p>
          <p className="text-xs mb-4" style={{ color: '#999' }}>
            Amount expected: <strong style={{ color: '#e8e8e8' }}>${Number(ride.price_quoted_usd).toFixed(2)}</strong>
          </p>
          <button
            onClick={() => onConfirmZelle(ride.id)}
            className="px-6 py-2 text-xs font-semibold uppercase tracking-wider cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ffb400] focus:ring-offset-2 focus:ring-offset-[#0a0a0a]"
            style={{ background: '#ffb400', color: '#0a0a0a' }}
          >
            Confirm Payment Received
          </button>
        </div>
      )}

      {/* Driver Assignment */}
      {ride.status === 'confirmed' && (
        <div
          className="p-6 mb-8"
          style={{
            background: 'rgba(59,130,246,0.05)',
            border: '1px solid rgba(59,130,246,0.2)',
          }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#3b82f6' }}>
            Assign Driver
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs mb-2" style={{ color: '#888' }}>
                Driver
              </label>
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="w-full py-2 px-3 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e8e8e8',
                }}
                aria-label="Select driver"
              >
                <option value="">Select driver...</option>
                {drivers.filter(d => d.status === 'available').length === 0 ? (
                  <option disabled>No available drivers</option>
                ) : null}
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} ({d.status})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-2" style={{ color: '#888' }}>
                Vehicle
              </label>
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full py-2 px-3 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e8e8e8',
                }}
                aria-label="Select vehicle"
              >
                <option value="">Select vehicle...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate_number} ({v.vehicle_class})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={() => {
              if (selectedDriver && selectedVehicle) {
                onAssign(ride.id, selectedDriver, selectedVehicle)
              }
            }}
            disabled={!selectedDriver || !selectedVehicle}
            className="px-6 py-2 text-xs font-semibold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:ring-offset-2 focus:ring-offset-[#0a0a0a]"
            style={{ background: '#3b82f6', color: '#fff' }}
          >
            Assign Driver
          </button>
        </div>
      )}

      {/* Ride ID for reference */}
      <div className="text-xs" style={{ color: '#555' }}>
        Ride ID: {ride.id}
      </div>
    </div>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#666' }}>
        {label}
      </div>
      <div className="text-sm truncate" title={value}>
        {value}
      </div>
    </div>
  )
}
