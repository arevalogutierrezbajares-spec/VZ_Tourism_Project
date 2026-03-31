import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatDate } from '@/lib/utils';
import { BookingActions } from '@/components/provider/BookingActions';

export const metadata: Metadata = { title: 'Bookings' };

export default async function BookingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: provider } = await supabase.from('providers').select('id').eq('user_id', user.id).single();
  const { data: listings } = await supabase.from('listings').select('id').eq('provider_id', provider?.id || '');
  const listingIds = listings?.map((l) => l.id) || [];

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, listing:listings(title, slug, cover_image_url), tourist:users(full_name, email, avatar_url, nationality)')
    .in('listing_id', listingIds)
    .order('created_at', { ascending: false });

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-blue-100 text-blue-800',
    refunded: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bookings</h1>
        <p className="text-muted-foreground text-sm">{bookings?.length || 0} total bookings</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {['pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
          <Card key={status}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">
                {bookings?.filter((b) => b.status === status).length || 0}
              </p>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">{status}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bookings list */}
      {bookings && bookings.length > 0 ? (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {booking.listing?.cover_image_url ? (
                    <img
                      src={booking.listing.cover_image_url}
                      alt={booking.listing.title}
                      className="w-16 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-14 rounded-lg bg-muted flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{booking.listing?.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {booking.tourist?.full_name}
                          {booking.tourist?.nationality ? ` · ${booking.tourist.nationality}` : ''}
                        </p>
                      </div>
                      <Badge className={`text-xs ${statusColors[booking.status] || ''}`}>
                        {booking.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>Check-in: {formatDate(booking.check_in)}</span>
                      <span>Check-out: {formatDate(booking.check_out)}</span>
                      <span className="font-medium text-foreground">{formatCurrency(booking.total_usd)}</span>
                    </div>
                  </div>
                  <BookingActions bookingId={booking.id} status={booking.status} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">No bookings yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
