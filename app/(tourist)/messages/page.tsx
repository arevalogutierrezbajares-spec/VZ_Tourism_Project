'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { format, parseISO } from 'date-fns';
import { MessageCircle, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

interface GuestBooking {
  id: string;
  listing_name: string;
  check_in: string;
  check_out: string;
  status: string;
  confirmation_code: string;
  provider_phone: string | null;
}

const TEMPLATES = [
  { label: 'Check-in time', message: 'What time can I check in?' },
  { label: 'Directions', message: 'How do I get to the property?' },
  { label: 'Breakfast', message: 'Is breakfast included?' },
  { label: 'Early arrival', message: 'Can I arrive early?' },
];

function waLink(booking: GuestBooking, message: string): string {
  const full = `${message}\n\n(Booking ${booking.confirmation_code} at ${booking.listing_name}, ${format(parseISO(booking.check_in), 'MMM d')}–${format(parseISO(booking.check_out), 'MMM d, yyyy')})`;
  const number = booking.provider_phone ? booking.provider_phone.replace(/\D/g, '') : '';
  return `https://wa.me/${number}?text=${encodeURIComponent(full)}`;
}

export default function MessagesPage() {
  const { profile, isAuthenticated } = useAuth();
  const [bookings, setBookings] = useState<GuestBooking[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/bookings/mine')
      .then((r) => r.json())
      .then((d) => setBookings((d.bookings ?? []).filter((b: GuestBooking) => b.status !== 'cancelled')))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [isAuthenticated]);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <div className="container px-4 py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Messages</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Hi {firstName}! Contact hosts via WhatsApp for your bookings.
      </p>

      {fetching ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MessageCircle className="w-12 h-12 text-sky-300 mb-4" />
          <p className="text-muted-foreground mb-3">No bookings to message about yet.</p>
          <Link href="/" className="text-sm font-medium text-sky-500 hover:underline">
            Book your first stay to message hosts →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id} className="rounded-xl shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold">{booking.listing_name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {format(parseISO(booking.check_in), 'MMM d')} – {format(parseISO(booking.check_out), 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-muted-foreground">Ref: {booking.confirmation_code}</p>
                  </div>
                  <a
                    href={waLink(booking, 'Hello!')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-medium hover:bg-green-600 transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Message Host
                  </a>
                </div>

                <div className="flex flex-wrap gap-2">
                  {TEMPLATES.map(({ label, message }) => (
                    <a
                      key={label}
                      href={waLink(booking, message)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 rounded-full border border-sky-200 text-sky-700 bg-sky-50 hover:bg-sky-100 transition-colors"
                    >
                      {label}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
