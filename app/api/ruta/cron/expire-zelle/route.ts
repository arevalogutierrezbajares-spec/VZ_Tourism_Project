import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Called by Vercel Cron every 15 minutes
// vercel.json: { "crons": [{ "path": "/api/ruta/cron/expire-zelle", "schedule": "*/15 * * * *" }] }

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets this automatically for cron jobs)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const supabase = await createClient()

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
    console.log(`Expired ${expiredCount} Zelle rides:`, expiredRides?.map((r) => r.id))
    // TODO: Send expiration notification emails
  }

  return NextResponse.json({
    expired: expiredCount,
    ride_ids: expiredRides?.map((r) => r.id) || [],
  })
}
