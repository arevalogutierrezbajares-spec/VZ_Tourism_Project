'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { RutaVehicle, RutaVehicleClass, RutaArmorRating } from '@/types/ruta'

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<RutaVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    plate_number: '',
    vehicle_class: 'suv' as RutaVehicleClass,
    armor_rating: 'b5' as RutaArmorRating,
    capacity: 4,
    tracker_device_id: '',
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadVehicles()
  }, [])

  async function loadVehicles() {
    setLoading(true)
    const { data } = await supabase
      .from('ruta_vehicles')
      .select('*')
      .order('created_at', { ascending: false })
    setVehicles((data as RutaVehicle[]) || [])
    setLoading(false)
  }

  async function createVehicle() {
    if (!form.make || !form.model || !form.plate_number || !form.color) return

    const { error } = await supabase.from('ruta_vehicles').insert({
      make: form.make,
      model: form.model,
      year: form.year,
      color: form.color,
      plate_number: form.plate_number,
      vehicle_class: form.vehicle_class,
      armor_rating: form.armor_rating,
      capacity: form.capacity,
      tracker_device_id: form.tracker_device_id || null,
    })

    if (error) {
      alert(`Failed: ${error.message}`)
      return
    }

    setForm({
      make: '',
      model: '',
      year: new Date().getFullYear(),
      color: '',
      plate_number: '',
      vehicle_class: 'suv',
      armor_rating: 'b5',
      capacity: 4,
      tracker_device_id: '',
    })
    setShowForm(false)
    loadVehicles()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-xl font-semibold">Vehicles ({vehicles.length})</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs font-semibold uppercase tracking-wider px-4 py-2"
          style={{ background: '#c9a96e', color: '#0a0a0a' }}
        >
          {showForm ? 'Cancel' : 'Add Vehicle'}
        </button>
      </div>

      {showForm && (
        <div
          className="p-6 mb-8"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <input
              placeholder="Make (e.g., Toyota) *"
              value={form.make}
              onChange={(e) => setForm({ ...form, make: e.target.value })}
              className="py-3 px-4 text-sm"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8e8e8' }}
            />
            <input
              placeholder="Model (e.g., Land Cruiser) *"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              className="py-3 px-4 text-sm"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8e8e8' }}
            />
            <input
              placeholder="Year"
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })}
              className="py-3 px-4 text-sm"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8e8e8' }}
            />
            <input
              placeholder="Color *"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="py-3 px-4 text-sm"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8e8e8' }}
            />
            <input
              placeholder="Plate Number *"
              value={form.plate_number}
              onChange={(e) => setForm({ ...form, plate_number: e.target.value })}
              className="py-3 px-4 text-sm"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8e8e8' }}
            />
            <select
              value={form.vehicle_class}
              onChange={(e) => setForm({ ...form, vehicle_class: e.target.value as RutaVehicleClass })}
              className="py-3 px-4 text-sm"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8e8e8' }}
            >
              <option value="sedan">Sedan</option>
              <option value="suv">SUV</option>
              <option value="van">Van</option>
            </select>
            <select
              value={form.armor_rating}
              onChange={(e) => setForm({ ...form, armor_rating: e.target.value as RutaArmorRating })}
              className="py-3 px-4 text-sm"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8e8e8' }}
            >
              <option value="b5">B5</option>
              <option value="b4">B4</option>
              <option value="none">None</option>
            </select>
            <input
              placeholder="Tracker Device ID"
              value={form.tracker_device_id}
              onChange={(e) => setForm({ ...form, tracker_device_id: e.target.value })}
              className="py-3 px-4 text-sm"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8e8e8' }}
            />
          </div>
          <button
            onClick={createVehicle}
            className="text-xs font-semibold uppercase tracking-wider px-6 py-2"
            style={{ background: '#c9a96e', color: '#0a0a0a' }}
          >
            Save Vehicle
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm" style={{ color: '#666' }}>Loading vehicles...</p>
      ) : vehicles.length === 0 ? (
        <p className="text-sm" style={{ color: '#666' }}>No vehicles yet. Add your first vehicle above.</p>
      ) : (
        <div className="space-y-2">
          {vehicles.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between p-4"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div>
                <div className="text-sm font-medium">
                  {v.year} {v.make} {v.model} ({v.color})
                </div>
                <div className="text-xs" style={{ color: '#888' }}>
                  {v.plate_number} · {v.vehicle_class.toUpperCase()} · Armor: {v.armor_rating.toUpperCase()} · Cap: {v.capacity}
                </div>
              </div>
              <div className="text-xs" style={{ color: '#555' }}>
                {v.tracker_device_id ? `Tracker: ${v.tracker_device_id}` : 'No tracker'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
