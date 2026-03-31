import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Calendar' };

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: provider } = await supabase.from('providers').select('id').eq('user_id', user.id).single();
  const { data: listings } = await supabase.from('listings').select('id').eq('provider_id', provider?.id || '');
  const listingIds = listings?.map((l) => l.id) || [];

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const { data: upcomingBookings } = await supabase
    .from('bookings')
    .select('*, listing:listings(title), tourist:users(full_name)')
    .in('listing_id', listingIds)
    .in('status', ['confirmed', 'pending'])
    .gte('check_in', now.toISOString())
    .lte('check_in', thirtyDaysFromNow.toISOString())
    .order('check_in', { ascending: true });

  // Group by date
  const bookingsByDate = (upcomingBookings || []).reduce<Record<string, typeof upcomingBookings>>((acc, booking) => {
    const dateKey = booking.check_in.split('T')[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey]!.push(booking);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="text-muted-foreground text-sm">Upcoming bookings for the next 30 days</p>
      </div>

      {Object.keys(bookingsByDate).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(bookingsByDate).map(([date, dayBookings]) => (
            <Card key={date}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  {formatDate(date)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dayBookings?.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="text-sm font-medium">{booking.listing?.title}</p>
                        <p className="text-xs text-muted-foreground">{booking.tourist?.full_name}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'} className="text-xs">
                          {booking.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {booking.guests} guest{booking.guests !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">No upcoming bookings in the next 30 days</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
