'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  Clock,
  Calendar,
  Users,
  DollarSign,
  Phone,
  MessageCircle,
  Share2,
  Download,
  ArrowLeft,
  CreditCard,
  Banknote,
  Map,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { LocalBooking } from '@/lib/bookings-store';

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof CheckCircle; color: string; bg: string }
> = {
  confirmed: {
    label: 'Confirmed',
    icon: CheckCircle,
    color: 'text-status-confirmed',
    bg: 'bg-status-confirmed/10 border-status-confirmed/30',
  },
  pending: {
    label: 'Pending Payment',
    icon: Clock,
    color: 'text-status-pending',
    bg: 'bg-status-pending/10 border-status-pending/30',
  },
  payment_submitted: {
    label: 'Payment Submitted',
    icon: Clock,
    color: 'text-status-info',
    bg: 'bg-status-info/10 border-status-info/30',
  },
  cancelled: {
    label: 'Cancelled',
    icon: Clock,
    color: 'text-status-cancelled',
    bg: 'bg-status-cancelled/10 border-status-cancelled/30',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle,
    color: 'text-status-info',
    bg: 'bg-status-info/10 border-status-info/30',
  },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: 'Credit/Debit Card',
  zelle: 'Zelle',
  usdt: 'USDT (Crypto)',
  arrival: 'Pay on Arrival',
};

function QrDisplay({ value }: { value: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="p-3 bg-background border-2 border-border rounded-xl shadow-sm">
        <QRCodeSVG
          value={value}
          size={160}
          level="M"
          includeMargin={false}
        />
      </div>
      <p className="text-xs text-muted-foreground">Show this at check-in</p>
    </div>
  );
}

function generateICS(booking: LocalBooking): string {
  const start = booking.check_in.replace(/-/g, '');
  const end = booking.check_out.replace(/-/g, '');
  const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VZ Tourism//Booking//EN',
    'BEGIN:VEVENT',
    `UID:${booking.id}@vz-tourism.com`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${booking.listing_name}`,
    `DESCRIPTION:Booking: ${booking.confirmation_code}\\nGuests: ${booking.guest_count}\\nTotal: $${booking.total_usd.toFixed(2)}`,
    `LOCATION:${booking.listing_name}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function downloadICS(booking: LocalBooking) {
  const ics = generateICS(booking);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `booking-${booking.confirmation_code}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

function shareWhatsApp(booking: LocalBooking) {
  const msg = encodeURIComponent(
    `My VZ Tourism booking:\n` +
      `Experience: ${booking.listing_name}\n` +
      `Check-in: ${booking.check_in}\n` +
      `Check-out: ${booking.check_out}\n` +
      `Guests: ${booking.guest_count}\n` +
      `Total: $${booking.total_usd.toFixed(2)}\n` +
      `Booking code: ${booking.confirmation_code}`
  );
  window.open(`https://wa.me/?text=${msg}`, '_blank');
}

interface Props {
  booking: LocalBooking;
}

export function ConfirmationClient({ booking }: Props) {
  const [copied, setCopied] = useState(false);
  const config = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = config.icon;

  const copyCode = () => {
    navigator.clipboard.writeText(booking.confirmation_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to home
        </Link>

        {/* Status header */}
        <Card className={`border-2 ${config.bg}`}>
          <CardContent className="pt-6 pb-4 text-center space-y-2">
            <StatusIcon className={`w-12 h-12 mx-auto ${config.color}`} />
            <h1 className={`text-xl font-bold ${config.color}`}>{config.label}</h1>
            <p className="text-sm text-muted-foreground">
              {booking.status === 'confirmed'
                ? 'Your booking is confirmed. See you there!'
                : booking.status === 'payment_submitted'
                ? "We've received your payment info. We'll confirm within 1 hour."
                : booking.status === 'pending'
                ? 'Your booking is reserved. Complete payment to confirm.'
                : 'Your experience has been booked.'}
            </p>
          </CardContent>
        </Card>

        {/* Confirmation code + QR */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Booking Reference</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-mono font-bold tracking-widest">
                  {booking.confirmation_code}
                </span>
                <Button variant="ghost" size="sm" onClick={copyCode} className="h-7 px-2">
                  {copied ? '✓ Copied' : 'Copy'}
                </Button>
              </div>
            </div>
            <div className="flex justify-center">
              <QrDisplay value={booking.confirmation_code} />
            </div>
          </CardContent>
        </Card>

        {/* Booking details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Experience</span>
                <span className="font-semibold text-right max-w-[60%]">{booking.listing_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  Check-in
                </span>
                <span className="font-medium">{booking.check_in}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  Check-out
                </span>
                <span className="font-medium">{booking.check_out}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  Guests
                </span>
                <span className="font-medium">{booking.guest_count}</span>
              </div>
            </div>

            <div className="border-t pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>
                  ${booking.base_price_usd.toFixed(2)} × {booking.guest_count} guest
                  {booking.guest_count > 1 ? 's' : ''} × {booking.nights} night
                  {booking.nights > 1 ? 's' : ''}
                </span>
                <span>${booking.subtotal_usd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Service fee (12%)</span>
                <span>${booking.service_fee_usd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-1 border-t">
                <span className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  Total
                </span>
                <span>${booking.total_usd.toFixed(2)} USD</span>
              </div>
            </div>

            <div className="flex justify-between text-sm pt-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5" />
                Payment method
              </span>
              <Badge variant="secondary">
                {PAYMENT_METHOD_LABELS[booking.payment_method] ?? booking.payment_method}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Guest info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Guest Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{booking.guest_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{booking.guest_email}</span>
            </div>
            {booking.guest_phone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  Phone
                </span>
                <span className="font-medium">{booking.guest_phone}</span>
              </div>
            )}
            {booking.special_requests && (
              <div className="pt-2 border-t">
                <p className="text-muted-foreground text-xs mb-1">Special requests</p>
                <p className="text-sm">{booking.special_requests}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual payment pending notice */}
        {(booking.payment_method === 'zelle' || booking.payment_method === 'usdt') &&
          booking.status === 'pending' && (
            <Card className="border-status-pending/30 bg-status-pending/10">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-2">
                  <Banknote className="w-5 h-5 text-status-pending flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="text-sm space-y-1">
                    <p className="font-semibold text-foreground">Payment pending</p>
                    <p className="text-muted-foreground">
                      Once you complete your{' '}
                      {booking.payment_method === 'zelle' ? 'Zelle' : 'USDT'} transfer, contact us
                      on WhatsApp with your booking code{' '}
                      <strong>{booking.confirmation_code}</strong> and a screenshot of your
                      transfer.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => downloadICS(booking)} className="flex-1">
            <Download className="w-4 h-4 mr-1.5" />
            Add to Calendar
          </Button>
          <Button variant="outline" onClick={() => shareWhatsApp(booking)} className="flex-1">
            <MessageCircle className="w-4 h-4 mr-1.5" />
            Share via WhatsApp
          </Button>
        </div>

        {/* Build a trip CTA */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Map className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Build a trip around this</p>
              <p className="text-xs text-muted-foreground">Add more stops, flights & activities</p>
            </div>
            <Button asChild size="sm" className="flex-shrink-0">
              <Link href={`/itineraries?add=${booking.listing_id ?? ''}`}>
                Plan
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Button asChild variant="ghost" className="w-full">
          <Link href="/">
            <Share2 className="w-4 h-4 mr-1.5" />
            Explore more experiences
          </Link>
        </Button>
      </div>
    </div>
  );
}
