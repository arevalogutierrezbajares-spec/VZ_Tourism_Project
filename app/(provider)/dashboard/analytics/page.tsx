import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { TrendingUp, DollarSign, Users, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = { title: 'Analytics' };

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: provider } = await supabase.from('providers').select('id').eq('user_id', user.id).single();
  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, rating, review_count, price_usd, is_published')
    .eq('provider_id', provider?.id || '');

  const listingIds = listings?.map((l) => l.id) || [];

  const { data: bookings } = await supabase
    .from('bookings')
    .select('total_usd, status, guests, created_at')
    .in('listing_id', listingIds);

  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating, created_at')
    .in('listing_id', listingIds);

  const totalRevenue = bookings?.filter((b) => b.status === 'completed').reduce((s, b) => s + (b.total_usd || 0), 0) || 0;
  const totalGuests = bookings?.filter((b) => ['confirmed', 'completed'].includes(b.status)).reduce((s, b) => s + (b.guests || 0), 0) || 0;
  const avgRating = reviews?.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const conversionRate = bookings?.length ? (bookings.filter((b) => b.status !== 'cancelled').length / bookings.length * 100) : 0;

  // Monthly revenue breakdown (last 6 months)
  const monthlyRevenue: Record<string, number> = {};
  bookings?.filter((b) => b.status === 'completed').forEach((b) => {
    const month = new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (b.total_usd || 0);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm">Performance overview for all your listings</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(totalRevenue)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Guests</p>
                <p className="text-2xl font-bold mt-1">{totalGuests}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Rating</p>
                <p className="text-2xl font-bold mt-1">{avgRating.toFixed(2)}</p>
              </div>
              <Star className="w-8 h-8 text-yellow-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold mt-1">{conversionRate.toFixed(0)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by month */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by Month</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(monthlyRevenue).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(monthlyRevenue).map(([month, revenue]) => {
                  const maxRevenue = Math.max(...Object.values(monthlyRevenue));
                  const pct = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={month} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16 flex-shrink-0">{month}</span>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-medium w-20 text-right">{formatCurrency(revenue)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No revenue data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Top listings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Listings Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {listings && listings.length > 0 ? (
              <div className="space-y-3">
                {listings.map((listing) => (
                  <div key={listing.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium truncate max-w-[180px]">{listing.title}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(listing.price_usd)} per booking</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">★ {listing.rating?.toFixed(1) || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">{listing.review_count || 0} reviews</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No listings yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
