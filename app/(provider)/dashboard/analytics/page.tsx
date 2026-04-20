import type { Metadata } from 'next';
import { TrendingUp, DollarSign, Users, Repeat, Percent, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { getAllBookings } from '@/lib/bookings-store';
import { formatCurrency } from '@/lib/utils';
import { AnalyticsCharts } from '@/components/provider/AnalyticsCharts';

export const metadata: Metadata = { title: 'Analytics' };

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: 'Card',
  zelle: 'Zelle',
  usdt: 'USDT',
  arrival: 'On Arrival',
};

export default function AnalyticsPage() {
  const bookings = getAllBookings();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const activeBookings = bookings.filter((b) => ['confirmed', 'completed'].includes(b.status));

  // This month's bookings
  const monthBookings = activeBookings.filter((b) => new Date(b.created_at) >= monthStart);

  const totalBookingsThisMonth = monthBookings.length;
  const revenueThisMonth = monthBookings.reduce((s, b) => s + b.net_provider_usd, 0);
  const avgBookingValue = monthBookings.length
    ? monthBookings.reduce((s, b) => s + b.total_usd, 0) / monthBookings.length
    : 0;

  // Occupancy rate this month
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const listingIds = [...new Set(activeBookings.map((b) => b.listing_id))];
  const totalAvailableNights = daysInMonth * Math.max(listingIds.length, 1);
  const bookedNightsThisMonth = monthBookings.reduce((s, b) => s + b.nights, 0);
  const occupancyRate = totalAvailableNights > 0
    ? Math.min(100, (bookedNightsThisMonth / totalAvailableNights) * 100)
    : 0;

  // Repeat guest rate
  const guestEmailCounts: Record<string, number> = {};
  activeBookings.forEach((b) => {
    guestEmailCounts[b.guest_email] = (guestEmailCounts[b.guest_email] || 0) + 1;
  });
  const repeatGuests = Object.values(guestEmailCounts).filter((c) => c > 1).length;
  const totalGuests = Object.keys(guestEmailCounts).length;
  const repeatGuestRate = totalGuests > 0 ? (repeatGuests / totalGuests) * 100 : 0;

  // Daily revenue for last 30 days
  const revenueData = Array.from({ length: 30 }, (_, i) => {
    const day = startOfDay(addDays(now, -(29 - i)));
    const nextDay = addDays(day, 1);
    const rev = activeBookings
      .filter((b) => {
        const d = new Date(b.created_at);
        return d >= day && d < nextDay;
      })
      .reduce((s, b) => s + b.net_provider_usd, 0);
    return {
      date: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: Math.round(rev * 100) / 100,
    };
  });

  // Conversion funnel: views (estimated) → pending → confirmed → completed
  const totalPending = bookings.filter((b) => b.status === 'pending').length;
  const totalConfirmed = bookings.filter((b) => ['confirmed', 'completed'].includes(b.status)).length;
  const totalCompleted = bookings.filter((b) => b.status === 'completed').length;
  const estimatedViews = Math.round(bookings.length * 4.2); // rough estimate based on industry averages
  const funnelData = [
    { name: 'Views (est.)', value: estimatedViews },
    { name: 'Inquiries', value: bookings.length },
    { name: 'Confirmed', value: totalConfirmed },
    { name: 'Completed', value: totalCompleted },
  ];

  // Payment method breakdown
  const byMethod: Record<string, number> = {};
  activeBookings.forEach((b) => {
    const label = PAYMENT_METHOD_LABELS[b.payment_method] || b.payment_method;
    byMethod[label] = (byMethod[label] || 0) + 1;
  });
  const paymentMethodData = Object.entries(byMethod)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }));

  // Occupancy by week (last 8 weeks)
  const occupancyData = Array.from({ length: 8 }, (_, i) => {
    const weekStart = startOfDay(addDays(now, -(7 * (7 - i))));
    const weekEnd = addDays(weekStart, 7);
    const weekNights = activeBookings
      .filter((b) => {
        const ci = new Date(b.check_in);
        return ci >= weekStart && ci < weekEnd;
      })
      .reduce((s, b) => s + b.nights, 0);
    const availableNights = 7 * Math.max(listingIds.length, 1);
    return {
      week: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      occupancy: Math.min(100, Math.round((weekNights / availableNights) * 100)),
    };
  });

  // Bookings by listing
  const byListing: Record<string, { name: string; count: number }> = {};
  activeBookings.forEach((b) => {
    if (!byListing[b.listing_id]) {
      byListing[b.listing_id] = {
        name: b.listing_name.length > 20 ? b.listing_name.slice(0, 20) + '…' : b.listing_name,
        count: 0,
      };
    }
    byListing[b.listing_id].count += 1;
  });
  const bookingsByListing = Object.values(byListing)
    .map((l) => ({ listing: l.name, bookings: l.count }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm">Performance overview for all your listings</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Bookings This Month</p>
                <p className="text-2xl font-bold mt-1">{totalBookingsThisMonth}</p>
              </div>
              <BarChart3 className="w-7 h-7 text-blue-500 opacity-60 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Revenue This Month</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(revenueThisMonth)}</p>
              </div>
              <DollarSign className="w-7 h-7 text-green-500 opacity-60 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg. Booking Value</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(avgBookingValue)}</p>
              </div>
              <TrendingUp className="w-7 h-7 text-purple-500 opacity-60 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Occupancy Rate</p>
                <p className="text-2xl font-bold mt-1">{occupancyRate.toFixed(0)}%</p>
              </div>
              <Percent className="w-7 h-7 text-teal-500 opacity-60 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Repeat Guest Rate</p>
                <p className="text-2xl font-bold mt-1">{repeatGuestRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">{repeatGuests}/{totalGuests} guests</p>
              </div>
              <Repeat className="w-7 h-7 text-orange-500 opacity-60 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Guests</p>
                <p className="text-2xl font-bold mt-1">{totalGuests}</p>
              </div>
              <Users className="w-7 h-7 text-indigo-500 opacity-60 shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      <AnalyticsCharts
        revenueData={revenueData}
        funnelData={funnelData}
        paymentMethodData={paymentMethodData}
        occupancyData={occupancyData}
        bookingsByListing={bookingsByListing}
      />
    </div>
  );
}
