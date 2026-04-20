import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import {
  DollarSign, TrendingUp, TrendingDown, Clock, BarChart3, Percent,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { PLATFORM_COMMISSION_RATE } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';
import { RevenueChart } from '@/components/provider/RevenueChart';
import { RevenueExport } from '@/components/provider/RevenueExport';

export const metadata: Metadata = { title: 'Revenue' };

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: 'Credit Card',
  zelle: 'Zelle',
  usdt: 'USDT',
  arrival: 'Pay on Arrival',
};

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  card: 'bg-blue-100 text-blue-800',
  zelle: 'bg-purple-100 text-purple-800',
  usdt: 'bg-yellow-100 text-yellow-800',
  arrival: 'bg-green-100 text-green-800',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-status-pending/10 text-status-pending',
  confirmed: 'bg-status-confirmed/10 text-status-confirmed',
  completed: 'bg-status-info/10 text-status-info',
  cancelled: 'bg-status-cancelled/10 text-status-cancelled',
  payment_submitted: 'bg-status-pending/10 text-status-pending',
};

function Trend({ value, prev }: { value: number; prev: number }) {
  if (prev === 0 && value === 0) return null;
  if (prev === 0) return <span className="text-xs text-green-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> New</span>;
  const pct = ((value - prev) / prev) * 100;
  const up = pct >= 0;
  return (
    <span className={`text-xs flex items-center gap-0.5 ${up ? 'text-green-600' : 'text-red-500'}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

export default async function RevenuePage() {
  const supabase = await createClient();
  if (!supabase) redirect('/login');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: provider } = await supabase.from('providers').select('id').eq('user_id', user.id).single();
  const { data: listings } = await supabase.from('listings').select('id').eq('provider_id', provider?.id || '');
  const listingIds = listings?.map((l) => l.id) || [];

  type RevenueBookingRow = {
    id: string; listing_id: string; listing_name: string; guest_name: string;
    guest_email: string; check_in: string; check_out: string; nights: number;
    guest_count: number; subtotal_usd: number; commission_usd: number;
    total_usd: number; net_provider_usd: number; payment_method: string;
    status: string; confirmation_code: string; created_at: string;
  };

  const { data: rawBookings = [] } = listingIds.length > 0
    ? await supabase
        .from('guest_bookings')
        .select('id, listing_id, listing_name, guest_name, guest_email, check_in, check_out, nights, guest_count, subtotal_usd, commission_usd, total_usd, net_provider_usd, payment_method, status, confirmation_code, created_at')
        .in('listing_id', listingIds)
        .order('created_at', { ascending: false })
    : { data: [] as RevenueBookingRow[] };

  const bookings = (rawBookings ?? []) as RevenueBookingRow[];
  const activeBookings = bookings.filter((b) => ['confirmed', 'completed'].includes(b.status));

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfDay(addDays(now, -7));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevWeekStart = startOfDay(addDays(now, -14));
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

  function revenueInRange(from: Date, to: Date) {
    return activeBookings
      .filter((b) => {
        const d = new Date(b.created_at);
        return d >= from && d < to;
      })
      .reduce((s, b) => s + b.net_provider_usd, 0);
  }

  const todayRevenue = revenueInRange(todayStart, addDays(todayStart, 1));
  const weekRevenue = revenueInRange(weekStart, addDays(weekStart, 7));
  const monthRevenue = revenueInRange(monthStart, addDays(monthStart, 32));
  const prevWeekRevenue = revenueInRange(prevWeekStart, weekStart);
  const prevMonthRevenue = revenueInRange(prevMonthStart, prevMonthEnd);

  // Today's gross
  const todayGross = activeBookings
    .filter((b) => {
      const d = new Date(b.created_at);
      return d >= todayStart && d < addDays(todayStart, 1);
    })
    .reduce((s, b) => s + b.total_usd, 0);

  // Daily revenue for last 30 days
  const dailyData: { date: string; revenue: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const day = startOfDay(addDays(now, -i));
    const nextDay = addDays(day, 1);
    const rev = activeBookings
      .filter((b) => {
        const d = new Date(b.created_at);
        return d >= day && d < nextDay;
      })
      .reduce((s, b) => s + b.net_provider_usd, 0);
    dailyData.push({
      date: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: Math.round(rev * 100) / 100,
    });
  }

  // Revenue by listing
  const byListing: Record<string, { name: string; revenue: number; bookings: number }> = {};
  activeBookings.forEach((b) => {
    if (!byListing[b.listing_id]) {
      byListing[b.listing_id] = { name: b.listing_name, revenue: 0, bookings: 0 };
    }
    byListing[b.listing_id].revenue += b.net_provider_usd;
    byListing[b.listing_id].bookings += 1;
  });
  const listingBreakdown = Object.values(byListing).sort((a, b) => b.revenue - a.revenue);

  // Revenue by payment method
  const byMethod: Record<string, number> = {};
  activeBookings.forEach((b) => {
    byMethod[b.payment_method] = (byMethod[b.payment_method] || 0) + b.net_provider_usd;
  });

  // Average booking value
  const avgBookingValue = activeBookings.length
    ? activeBookings.reduce((s, b) => s + b.total_usd, 0) / activeBookings.length
    : 0;

  // Occupancy rate for current month (nights booked / total available nights)
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const listingCount = listingBreakdown.length || 1;
  const totalAvailableNights = daysInMonth * listingCount;
  const bookedNights = activeBookings
    .filter((b) => {
      const ci = new Date(b.check_in);
      return ci.getFullYear() === now.getFullYear() && ci.getMonth() === now.getMonth();
    })
    .reduce((s, b) => s + b.nights, 0);
  const occupancyRate = totalAvailableNights > 0
    ? Math.min(100, (bookedNights / totalAvailableNights) * 100)
    : 0;

  const pendingRevenue = bookings
    .filter((b) => b.status === 'confirmed')
    .reduce((s, b) => s + b.net_provider_usd, 0);

  const currentMonthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const recentTransactions = [...activeBookings]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Revenue</h1>
          <p className="text-muted-foreground text-sm">Track your earnings and payouts</p>
        </div>
        <RevenueExport bookings={bookings} month={currentMonthLabel} />
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Today</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(todayRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Gross {formatCurrency(todayGross)}</p>
              </div>
              <DollarSign className="w-7 h-7 text-green-500 opacity-60 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">This Week</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(weekRevenue)}</p>
                <Trend value={weekRevenue} prev={prevWeekRevenue} />
              </div>
              <TrendingUp className="w-7 h-7 text-blue-500 opacity-60 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">This Month</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(monthRevenue)}</p>
                <Trend value={monthRevenue} prev={prevMonthRevenue} />
              </div>
              <BarChart3 className="w-7 h-7 text-purple-500 opacity-60 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(pendingRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Confirmed, unpaid</p>
              </div>
              <Clock className="w-7 h-7 text-yellow-500 opacity-60 shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg. Booking Value</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(avgBookingValue)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{activeBookings.length} total bookings</p>
              </div>
              <DollarSign className="w-7 h-7 text-indigo-500 opacity-60 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Occupancy Rate</p>
                <p className="text-2xl font-bold mt-1">{occupancyRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">{bookedNights}/{totalAvailableNights} nights</p>
              </div>
              <Percent className="w-7 h-7 text-teal-500 opacity-60 shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue chart */}
      <RevenueChart data={dailyData} />

      {/* Breakdown row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By listing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by Listing</CardTitle>
          </CardHeader>
          <CardContent>
            {listingBreakdown.length > 0 ? (
              <div className="space-y-3">
                {listingBreakdown.map((l) => {
                  const totalNet = activeBookings.reduce((s, b) => s + b.net_provider_usd, 0) || 1;
                  const pct = (l.revenue / totalNet) * 100;
                  return (
                    <div key={l.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium truncate max-w-[60%]">{l.name}</span>
                        <span className="text-muted-foreground">{formatCurrency(l.revenue)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{l.bookings} booking{l.bookings !== 1 ? 's' : ''}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data</p>
            )}
          </CardContent>
        </Card>

        {/* By payment method */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(byMethod).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(byMethod)
                  .sort(([, a], [, b]) => b - a)
                  .map(([method, amount]) => {
                    const total = Object.values(byMethod).reduce((s, v) => s + v, 0) || 1;
                    const pct = (amount / total) * 100;
                    return (
                      <div key={method}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{PAYMENT_METHOD_LABELS[method] || method}</span>
                          <span className="text-muted-foreground">{formatCurrency(amount)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{pct.toFixed(0)}% of total</p>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Platform fee info */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Platform commission:</span>{' '}
            {(PLATFORM_COMMISSION_RATE * 100).toFixed(0)}% is deducted from each booking.
            This covers payment processing, customer support, and platform maintenance.
          </p>
        </CardContent>
      </Card>

      {/* Transaction history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length > 0 ? (
            <div className="divide-y">
              {recentTransactions.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between py-3 gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{booking.listing_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {booking.guest_name} · {formatDate(booking.check_in)} → {formatDate(booking.check_out)}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[booking.status] || ''}`}>
                        {booking.status}
                      </Badge>
                      <Badge className={`text-[10px] px-1.5 py-0 ${PAYMENT_METHOD_COLORS[booking.payment_method] || ''}`}>
                        {PAYMENT_METHOD_LABELS[booking.payment_method] || booking.payment_method}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-green-600">
                      +{formatCurrency(booking.net_provider_usd)}
                    </p>
                    <p className="text-xs text-muted-foreground">Gross {formatCurrency(booking.total_usd)}</p>
                    <p className="text-xs text-muted-foreground">{booking.confirmation_code}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
