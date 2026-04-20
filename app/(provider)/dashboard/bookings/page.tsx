import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAllBookings, type LocalBooking, type BookingStatus } from '@/lib/bookings-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProviderBookingActions } from '@/components/provider/ProviderBookingActions';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Bookings' };
export const dynamic = 'force-dynamic';

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: 'bg-status-pending/10 text-status-pending border-status-pending/20',
  confirmed: 'bg-status-confirmed/10 text-status-confirmed border-status-confirmed/20',
  cancelled: 'bg-status-cancelled/10 text-status-cancelled border-status-cancelled/20',
  completed: 'bg-status-info/10 text-status-info border-status-info/20',
  payment_submitted: 'bg-status-pending/10 text-status-pending border-status-pending/20',
};

const PAYMENT_LABELS: Record<string, string> = {
  card: 'Card',
  zelle: 'Zelle',
  usdt: 'USDT',
  arrival: 'On Arrival',
};

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function BookingRow({ booking }: { booking: LocalBooking }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <p className="font-semibold text-sm truncate">{booking.listing_name}</p>
                <p className="text-xs text-muted-foreground">
                  {booking.guest_name} · {booking.guest_email}
                  {booking.guest_phone ? ` · ${booking.guest_phone}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="outline" className="text-xs">
                  {PAYMENT_LABELS[booking.payment_method] ?? booking.payment_method}
                </Badge>
                <Badge className={`text-xs ${STATUS_COLORS[booking.status] ?? ''}`}>
                  {booking.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
              <span>
                {formatDate(booking.check_in)} → {formatDate(booking.check_out)}
              </span>
              <span>{booking.guest_count} guest{booking.guest_count > 1 ? 's' : ''}</span>
              <span className="font-semibold text-foreground">
                ${booking.total_usd.toFixed(2)} total
              </span>
              <span className="text-status-confirmed">
                ${booking.net_provider_usd.toFixed(2)} to you
              </span>
            </div>

            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground font-mono">
                {booking.confirmation_code}
              </span>
              <ProviderBookingActions bookingId={booking.id} status={booking.status} />
            </div>

            {booking.special_requests && (
              <p className="text-xs text-muted-foreground mt-1 italic">
                &ldquo;{booking.special_requests}&rdquo;
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function BookingsPage() {
  const supabase = await createClient();
  if (!supabase) redirect('/login');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const allBookings = getAllBookings().sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const counts = {
    pending: allBookings.filter((b) => b.status === 'pending' || b.status === 'payment_submitted').length,
    confirmed: allBookings.filter((b) => b.status === 'confirmed').length,
    completed: allBookings.filter((b) => b.status === 'completed').length,
    cancelled: allBookings.filter((b) => b.status === 'cancelled').length,
  };

  const pendingBookings = allBookings.filter(
    (b) => b.status === 'pending' || b.status === 'payment_submitted'
  );
  const confirmedBookings = allBookings.filter((b) => b.status === 'confirmed');
  const pastBookings = allBookings.filter(
    (b) => b.status === 'completed' || b.status === 'cancelled'
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bookings</h1>
        <p className="text-muted-foreground text-sm">{allBookings.length} total bookings</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(
          [
            { label: 'Pending', count: counts.pending, color: 'text-status-pending' },
            { label: 'Confirmed', count: counts.confirmed, color: 'text-status-confirmed' },
            { label: 'Completed', count: counts.completed, color: 'text-status-info' },
            { label: 'Cancelled', count: counts.cancelled, color: 'text-status-cancelled' },
          ] as const
        ).map(({ label, count, color }) => (
          <Card key={label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{count}</p>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending / needs action */}
      {pendingBookings.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-status-pending uppercase tracking-wide">
            Needs Action ({pendingBookings.length})
          </h2>
          {pendingBookings.map((b) => (
            <BookingRow key={b.id} booking={b} />
          ))}
        </section>
      )}

      {/* Upcoming / confirmed */}
      {confirmedBookings.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-status-confirmed uppercase tracking-wide">
            Upcoming ({confirmedBookings.length})
          </h2>
          {confirmedBookings.map((b) => (
            <BookingRow key={b.id} booking={b} />
          ))}
        </section>
      )}

      {/* Past */}
      {pastBookings.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Past ({pastBookings.length})
          </h2>
          {pastBookings.map((b) => (
            <BookingRow key={b.id} booking={b} />
          ))}
        </section>
      )}

      {allBookings.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">No bookings yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Bookings will appear here once tourists book your experiences.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
