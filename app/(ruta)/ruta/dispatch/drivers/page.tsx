'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { RutaDriver, RutaDriverStatus } from '@/types/ruta'

const STATUS_COLORS: Record<RutaDriverStatus, string> = {
  available: '#22c55e',
  on_ride: '#3b82f6',
  offline: '#666',
  suspended: '#ef4444',
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<RutaDriver[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    license_number: '',
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadDrivers()
  }, [])

  async function loadDrivers() {
    setLoading(true)
    const { data } = await supabase
      .from('ruta_drivers')
      .select('*')
      .order('created_at', { ascending: false })
    setDrivers((data as RutaDriver[]) || [])
    setLoading(false)
  }

  async function createDriver() {
    if (!form.full_name || !form.phone || !form.license_number) return

    const { error } = await supabase.from('ruta_drivers').insert({
      full_name: form.full_name,
      phone: form.phone,
      email: form.email || null,
      license_number: form.license_number,
      status: 'offline',
    })

    if (error) {
      alert(`Failed: ${error.message}`)
      return
    }

    setForm({ full_name: '', phone: '', email: '', license_number: '' })
    setShowForm(false)
    loadDrivers()
  }

  async function toggleStatus(driver: RutaDriver) {
    const newStatus: RutaDriverStatus =
      driver.status === 'available' ? 'offline' : 'available'
    await supabase
      .from('ruta_drivers')
      .update({ status: newStatus })
      .eq('id', driver.id)
    loadDrivers()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-xl font-semibold">Drivers ({drivers.length})</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs font-semibold uppercase tracking-wider px-4 py-2"
          style={{ background: '#c9a96e', color: '#0a0a0a' }}
        >
          {showForm ? 'Cancel' : 'Add Driver'}
        </button>
      </div>

      {/* Add Driver Form */}
      {showForm && (
        <div
          className="p-6 mb-8"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input
              placeholder="Full Name *"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="py-3 px-4 text-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#e8e8e8',
              }}
            />
            <input
              placeholder="Phone *"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="py-3 px-4 text-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#e8e8e8',
              }}
            />
            <input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="py-3 px-4 text-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#e8e8e8',
              }}
            />
            <input
              placeholder="License Number *"
              value={form.license_number}
              onChange={(e) =>
                setForm({ ...form, license_number: e.target.value })
              }
              className="py-3 px-4 text-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#e8e8e8',
              }}
            />
          </div>
          <button
            onClick={createDriver}
            className="text-xs font-semibold uppercase tracking-wider px-6 py-2"
            style={{ background: '#c9a96e', color: '#0a0a0a' }}
          >
            Save Driver
          </button>
        </div>
      )}

      {/* Drivers List */}
      {loading ? (
        <p className="text-sm" style={{ color: '#666' }}>
          Loading drivers...
        </p>
      ) : drivers.length === 0 ? (
        <p className="text-sm" style={{ color: '#666' }}>
          No drivers yet. Add your first driver above.
        </p>
      ) : (
        <div className="space-y-2">
          {drivers.map((driver) => (
            <div
              key={driver.id}
              className="flex items-center justify-between p-4"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: STATUS_COLORS[driver.status] }}
                />
                <div>
                  <div className="text-sm font-medium">{driver.full_name}</div>
                  <div className="text-xs" style={{ color: '#888' }}>
                    {driver.phone} · License: {driver.license_number}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className="text-[10px] uppercase tracking-wider"
                  style={{ color: STATUS_COLORS[driver.status] }}
                >
                  {driver.status}
                </span>
                <button
                  onClick={() => toggleStatus(driver)}
                  className="text-xs px-3 py-1"
                  style={{
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#888',
                  }}
                >
                  {driver.status === 'available' ? 'Set Offline' : 'Set Available'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
