import { NextRequest, NextResponse } from 'next/server';
import { getAllBookings } from '@/lib/bookings-store';
import { requireAdmin } from '@/lib/api/require-auth';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const region = searchParams.get('region');
  const paymentMethod = searchParams.get('payment_method');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');

  let bookings = getAllBookings();

  if (status) bookings = bookings.filter((b) => b.status === status);
  if (paymentMethod) bookings = bookings.filter((b) => b.payment_method === paymentMethod);
  if (dateFrom) bookings = bookings.filter((b) => new Date(b.created_at) >= new Date(dateFrom));
  if (dateTo) bookings = bookings.filter((b) => new Date(b.created_at) <= new Date(dateTo));

  // Sort newest first
  bookings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const totalRevenue = bookings.reduce((s, b) => s + (b.total_usd || 0), 0);
  const totalCommission = bookings.reduce((s, b) => s + (b.commission_usd || 0), 0);
  const totalNetProvider = bookings.reduce((s, b) => s + (b.net_provider_usd || 0), 0);
  const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
  const cancellationRate = bookings.length > 0 ? (cancelled / bookings.length) * 100 : 0;

  return NextResponse.json({
    bookings,
    stats: {
      total: bookings.length,
      totalRevenue,
      totalCommission,
      totalNetProvider,
      cancellationRate,
      avgBookingValue: bookings.length > 0 ? totalRevenue / bookings.length : 0,
    },
  });
}
