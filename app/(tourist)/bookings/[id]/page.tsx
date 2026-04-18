'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { format, parseISO, differenceInDays, isFuture } from 'date-fns';
import {
  MapPin, Phone, MessageCircle, Calendar, Users, CreditCard,
  CheckCircle, Clock, XCircle, ChevronLeft, Cloud, AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface GuestBooking {
  id: string;
  listing_id: string;
  listing_name: string;
  listing_slug: string | null;
  provider_id: string | null;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  check_in: string;
  check_out: string;
  guest_count: number;
  base_price_usd: number;
  nights: number;
  subtotal_usd: number;
  service_fee_usd: number;
  total_usd: number;
  status: string;
  payment_method: string;
  confirmation_code: string;
  cancellation_policy: string | null;
  special_requests: string | null;
  notes: string | null;
}

/** Returns refund percentage and label based on days until check-in */
function getRefundEstimate(daysUntil: number, totalUsd: number) {
  if (daysUntil >= 14) return { pct: 90, label: 'Full refund (90%)', amount: totalUsd * 0.9, tier: 'green' };
  if (daysUntil >= 7)  return { pct: 70, label: 'Partial refund (70%)', amount: totalUsd * 0.7, tier: 'yellow' };
  if (daysUntil >= 3)  return { pct: 30, label: 'Partial refund (30%)', amount: totalUsd * 0.3, tier: 'orange' };
  return { pct: 0, label: 'No refund', amount: 0, tier: 'red' };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; note?: string }> = {
  confirmed: { label: 'Confirmed', color: 'bg-green-500', icon: <CheckCircle className="w-5 h-5" /> },
  pending: {
    label: 'Awaiting Confirmation',
    color: 'bg-amber-500',
    icon: <Clock className="w-5 h-5" />,
    note: 'The provider is reviewing your request. You\'ll hear back within 24 hours.',
  },
  payment_submitted: {
    label: 'Payment Sent',
    color: 'bg-blue-500',
    icon: <Clock className="w-5 h-5" />,
    note: 'We received your payment details and are verifying within 1 hour.',
  },
  cancelled: { label: 'Cancelled', color: 'bg-red-500', icon: <XCircle className="w-5 h-5" /> },
  completed: { label: 'Completed', color: 'bg-blue-500', icon: <CheckCircle className="w-5 h-5" /> },
};

function generateICS(booking: GuestBooking): string {
  const start = booking.check_in.replace(/-/g, '');
  const end = booking.check_out.replace(/-/g, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VZ Explorer//EN',
    'BEGIN:VEVENT',
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:Stay at ${booking.listing_name}`,
    `DESCRIPTION:Booking ${booking.confirmation_code} - VZ Explorer`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { loading, isAuthenticated } = useAuth();
  const [booking, setBooking] = useState<GuestBooking | null>(null);
  const [fetching, setFetching] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !id) return;
    fetch(`/api/bookings/${id}`)
      .then((r) => r.json())
      .then((d) => setBooking(d.booking ?? null))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [isAuthenticated, id]);

  const handleAddToCalendar = () => {
    if (!booking) return;
    const ics = generateICS(booking);
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `booking-${booking.confirmation_code}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCancel = async () => {
    if (!booking) return;
    setCancelling(true);
    try {
      await fetch(`/api/bookings/${booking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      setBooking((b) => b ? { ...b, status: 'cancelled' } : b);
      setShowCancelModal(false);
    } catch {
    } finally {
      setCancelling(false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (!booking) {
    return (
      <div className="container px-4 py-16 max-w-2xl mx-auto text-center">
        <p className="text-muted-foreground mb-4">Booking not found.</p>
        <Link href="/trips" className="text-sky-500 hover:underline text-sm">← Back to My Trips</Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;
  const checkIn = parseISO(booking.check_in);
  const checkOut = parseISO(booking.check_out);
  const daysUntilCheckin = differenceInDays(checkIn, new Date());
  const isUpcoming = isFuture(checkIn);
  const withinWeek = isUpcoming && daysUntilCheckin <= 7;

  const waMessage = `Hi, I have booking ${booking.confirmation_code} at ${booking.listing_name} for ${format(checkIn, 'MMM d')} – ${format(checkOut, 'MMM d, yyyy')}.`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(waMessage)}`;
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(`Check out my stay at ${booking.listing_name}! Booking ${booking.confirmation_code}`)}`;

  return (
    <div className="container px-4 py-6 max-w-2xl mx-auto">
      <Link href="/trips" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to My Trips
      </Link>

      {/* Status banner */}
      <div className={`${statusCfg.color} text-white rounded-xl px-4 py-3 flex items-center gap-2 mb-2`}>
        {statusCfg.icon}
        <span className="font-semibold">{statusCfg.label}</span>
        <span className="text-sm opacity-90 ml-auto">Ref: {booking.confirmation_code}</span>
      </div>
      {statusCfg.note && (
        <p className="text-sm text-muted-foreground px-1 mb-4">{statusCfg.note}</p>
      )}

      <div className="space-y-4">
        {/* Listing card */}
        <Card className="rounded-xl shadow-sm overflow-hidden">
          <div className="h-40 bg-gradient-to-br from-sky-100 to-amber-100 flex items-center justify-center">
            <MapPin className="w-12 h-12 text-sky-400" />
          </div>
          <CardContent className="p-4">
            <h2 className="text-xl font-bold mb-1">{booking.listing_name}</h2>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {format(checkIn, 'MMM d')} – {format(checkOut, 'MMM d, yyyy')}
                <span className="text-xs">({booking.nights} night{booking.nights !== 1 ? 's' : ''})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {booking.guest_count} guest{booking.guest_count !== 1 ? 's' : ''}
              </span>
            </div>
            {isUpcoming && daysUntilCheckin >= 0 && (
              <p className="text-sm font-semibold text-sky-600 mt-2">
                {daysUntilCheckin === 0 ? 'Check-in today!' : daysUntilCheckin === 1 ? 'Check-in tomorrow!' : `Check-in in ${daysUntilCheckin} days`}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Price breakdown */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Price Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">${booking.base_price_usd}/night × {booking.nights} nights</span>
              <span>${booking.subtotal_usd.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service fee</span>
              <span>${booking.service_fee_usd.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2 mt-1">
              <span>Total</span>
              <span>${booking.total_usd.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground capitalize">{booking.payment_method.replace('_', ' ')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Host contact */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Contact Host</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Message via WhatsApp
            </a>
            {booking.guest_phone && (
              <a
                href={`tel:${booking.guest_phone}`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:border-sky-400 hover:text-sky-600 transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call
              </a>
            )}
          </CardContent>
        </Card>

        {/* Pre-trip info */}
        {withinWeek && (
          <Card className="rounded-xl shadow-sm border-amber-200 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                <Cloud className="w-4 h-4" />
                Pre-trip Info
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-amber-900 space-y-2">
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(booking.listing_name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    View on Google Maps
                  </a>
                </span>
              </p>
              <p className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Emergency: dial 171 (Ambulance), 170 (Police), 169 (Fire)</span>
              </p>
              <p className="font-medium mt-2">What to bring:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Valid ID / Passport copy</li>
                <li>Cash in USD for local expenses</li>
                <li>Sunscreen & insect repellent</li>
                <li>Travel insurance documents</li>
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {booking.status !== 'cancelled' && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleAddToCalendar}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium hover:border-sky-400 hover:text-sky-600 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Add to Calendar
            </button>
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium hover:border-green-400 hover:text-green-600 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Share via WhatsApp
            </a>
            {isUpcoming && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors ml-auto"
              >
                <XCircle className="w-4 h-4" />
                Cancel Booking
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cancel modal */}
      {showCancelModal && (() => {
        const refund = getRefundEstimate(daysUntilCheckin, booking.total_usd);
        const refundColors: Record<string, string> = {
          green:  'bg-green-50 border-green-200 text-green-800',
          yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          orange: 'bg-orange-50 border-orange-200 text-orange-800',
          red:    'bg-red-50 border-red-200 text-red-800',
        };
        return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold">Cancel this booking?</h3>

            {/* Refund estimate */}
            <div className={`rounded-xl border px-4 py-3 text-sm ${refundColors[refund.tier]}`}>
              <p className="font-semibold">{refund.label}</p>
              {refund.amount > 0 ? (
                <p className="text-xs mt-0.5 opacity-80">
                  Estimated refund: <strong>${refund.amount.toFixed(2)}</strong> of ${booking.total_usd.toFixed(2)} paid
                </p>
              ) : (
                <p className="text-xs mt-0.5 opacity-80">
                  Check-in is {daysUntilCheckin <= 0 ? 'today or past' : `in ${daysUntilCheckin} day${daysUntilCheckin !== 1 ? 's' : ''}`} — refunds are not available this close to arrival.
                </p>
              )}
            </div>

            {/* Policy text */}
            {booking.cancellation_policy ? (
              <p className="text-xs text-muted-foreground border-l-2 pl-3">
                <span className="font-medium text-foreground">Policy: </span>
                {booking.cancellation_policy}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Cancellations made {daysUntilCheckin >= 14 ? '14+' : daysUntilCheckin >= 7 ? '7-13' : daysUntilCheckin >= 3 ? '3-6' : 'fewer than 3'} days before check-in qualify for {refund.pct}% back.
                Refunds are processed within 5-7 business days.
              </p>
            )}

            <p className="text-sm text-muted-foreground">
              Cancelling <strong>{booking.listing_name}</strong>. This cannot be undone.
            </p>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {cancelling ? 'Cancelling…' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
