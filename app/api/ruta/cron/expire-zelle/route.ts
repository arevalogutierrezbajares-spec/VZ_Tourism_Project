import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Called by Vercel Cron every 15 minutes
// vercel.json: { "crons": [{ "path": "/api/ruta/cron/expire-zelle", "schedule": "*/15 * * * *" }] }

export async function GET(request: NextRequest) {
  // Verify cron secret — fail closed if CRON_SECRET is not set
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!cronSecret || authHeader !== cronSecret) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const supabase = await createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  // Find Zelle rides older than 4 hours in pending_payment
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()

  const { data: expiredRides, error } = await supabase
    .from('ruta_rides')
    .update({
      status: 'payment_expired',
      payment_status: 'expired',
    })
    .eq('status', 'pending_payment')
    .eq('payment_method', 'zelle')
    .lt('created_at', fourHoursAgo)
    .select('id, passenger_email')

  if (error) {
    console.error('Failed to expire Zelle rides:', error)
    return NextResponse.json(
      { error: 'Failed to expire rides' },
      { status: 500 }
    )
  }

  const expiredCount = expiredRides?.length || 0
  if (expiredCount > 0) {
    // TODO: Send expiration notification emails
  }

  return NextResponse.json({
    expired: expiredCount,
    ride_ids: expiredRides?.map((r) => r.id) || [],
  })
}
