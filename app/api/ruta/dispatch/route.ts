import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireRutaRole } from '@/lib/ruta/auth'

export async function GET(request: NextRequest) {
  const auth = await requireRutaRole(['ruta_dispatcher', 'ruta_admin'])
  if (auth.error) return auth.error

  const filter = request.nextUrl.searchParams.get('filter') || 'active'

  const supabase = await createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  // Fetch rides
  let ridesQuery = supabase
    .from('ruta_rides')
    .select('*')
    .order('scheduled_at', { ascending: true })

  if (filter === 'active') {
    ridesQuery = ridesQuery.in('status', [
      'pending_payment', 'confirmed', 'assigned',
      'driver_en_route', 'pickup', 'in_progress',
    ])
  }

  const { data: rides, error: ridesError } = await ridesQuery.limit(50)

  // Fetch available drivers
  const { data: drivers } = await supabase
    .from('ruta_drivers')
    .select('id, full_name, status, phone')
    .order('full_name')

  // Fetch vehicles
  const { data: vehicles } = await supabase
    .from('ruta_vehicles')
    .select('id, plate_number, vehicle_class, make, model, armor_rating')
    .order('plate_number')

  if (ridesError) {
    console.error('Dispatch fetch error:', ridesError)
    return NextResponse.json({ error: 'Failed to fetch rides' }, { status: 500 })
  }

  return NextResponse.json({ rides: rides || [], drivers: drivers || [], vehicles: vehicles || [] })
}
