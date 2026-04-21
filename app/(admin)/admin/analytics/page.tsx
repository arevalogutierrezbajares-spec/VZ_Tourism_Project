import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';
import { PLATFORM_COMMISSION_RATE } from '@/lib/constants';

export const metadata: Metadata = { title: 'Admin: Analytics' };

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();
  if (!supabase) return <div className="p-6 text-muted-foreground">Database not configured.</div>;

  const [
    { count: totalUsers },
    { count: totalListings },
    { data: bookings },
    { count: publishedListings },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('listings').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('total_usd, status, created_at'),
    supabase.from('listings').select('*', { count: 'exact', head: true }).eq('is_published', true),
  ]);

  const completedBookings = bookings?.filter((b) => b.status === 'completed') || [];
  const grossRevenue = completedBookings.reduce((s, b) => s + (b.total_usd || 0), 0);
  const platformRevenue = grossRevenue * PLATFORM_COMMISSION_RATE;
  const totalBookings = bookings?.length || 0;
  const cancelledBookings = bookings?.filter((b) => b.status === 'cancelled').length || 0;

  const monthlyData: Record<string, { bookings: number; revenue: number }> = {};
  bookings?.forEach((b) => {
    const month = new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    if (!monthlyData[month]) monthlyData[month] = { bookings: 0, revenue: 0 };
    monthlyData[month]!.bookings++;
    if (b.status === 'completed') monthlyData[month]!.revenue += b.total_usd || 0;
  });

  const topMonths = Object.entries(monthlyData).slice(-6);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Analytics</h1>
        <p className="text-muted-foreground text-sm">Global metrics across all providers</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: totalUsers || 0 },
          { label: 'Published Listings', value: publishedListings || 0 },
          { label: 'Total Bookings', value: totalBookings },
          { label: 'Cancellation Rate', value: `${totalBookings ? ((cancelledBookings / totalBookings) * 100).toFixed(0) : 0}%` },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="p-5 text-center">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Platform Revenue</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Gross GMV</span>
              <span className="font-semibold">{formatCurrency(grossRevenue)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Platform Fee ({(PLATFORM_COMMISSION_RATE * 100).toFixed(0)}%)</span>
              <span className="font-semibold text-status-confirmed">{formatCurrency(platformRevenue)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Provider Payouts</span>
              <span className="font-semibold">{formatCurrency(grossRevenue - platformRevenue)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Monthly Bookings</CardTitle></CardHeader>
          <CardContent>
            {topMonths.length > 0 ? (
              <div className="space-y-2">
                {topMonths.map(([month, data]) => {
                  const maxBookings = Math.max(...topMonths.map(([, d]) => d.bookings));
                  const pct = maxBookings > 0 ? (data.bookings / maxBookings) * 100 : 0;
                  return (
                    <div key={month} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-14 flex-shrink-0">{month}</span>
                      <div className="flex-1 bg-muted rounded-full h-2" role="progressbar" aria-valuenow={data.bookings} aria-valuemin={0} aria-valuemax={maxBookings} aria-label={`${month}: ${data.bookings} bookings`}>
                        <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-medium w-12 text-right">{data.bookings}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No booking data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
