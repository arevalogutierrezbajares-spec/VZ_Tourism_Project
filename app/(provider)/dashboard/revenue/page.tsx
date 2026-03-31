import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { DollarSign, TrendingUp, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PLATFORM_COMMISSION_RATE } from '@/lib/constants';

export const metadata: Metadata = { title: 'Revenue' };

export default async function RevenuePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: provider } = await supabase.from('providers').select('id').eq('user_id', user.id).single();
  const { data: listings } = await supabase.from('listings').select('id').eq('provider_id', provider?.id || '');
  const listingIds = listings?.map((l) => l.id) || [];

  const { data: completedBookings } = await supabase
    .from('bookings')
    .select('*, listing:listings(title)')
    .in('listing_id', listingIds)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  const { data: pendingBookings } = await supabase
    .from('bookings')
    .select('total_usd')
    .in('listing_id', listingIds)
    .eq('status', 'confirmed');

  const grossRevenue = completedBookings?.reduce((s, b) => s + (b.total_usd || 0), 0) || 0;
  const platformFees = grossRevenue * PLATFORM_COMMISSION_RATE;
  const netRevenue = grossRevenue - platformFees;
  const pendingRevenue = pendingBookings?.reduce((s, b) => s + (b.total_usd || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Revenue</h1>
        <p className="text-muted-foreground text-sm">Track your earnings and payouts</p>
      </div>

      {/* Revenue summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gross Revenue</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(grossRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">All completed bookings</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Revenue</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(netRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">After {(PLATFORM_COMMISSION_RATE * 100).toFixed(0)}% platform fee</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(pendingRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">Confirmed, not completed</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform fee info */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Platform commission:</span>{' '}
            {(PLATFORM_COMMISSION_RATE * 100).toFixed(0)}% is deducted from each completed booking.
            This covers payment processing, customer support, and platform maintenance.
          </p>
        </CardContent>
      </Card>

      {/* Transaction history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {completedBookings && completedBookings.length > 0 ? (
            <div className="space-y-2">
              {completedBookings.map((booking) => {
                const gross = booking.total_usd || 0;
                const fee = gross * PLATFORM_COMMISSION_RATE;
                const net = gross - fee;
                return (
                  <div key={booking.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{booking.listing?.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(booking.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">+{formatCurrency(net)}</p>
                      <p className="text-xs text-muted-foreground">Gross: {formatCurrency(gross)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No completed bookings yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
