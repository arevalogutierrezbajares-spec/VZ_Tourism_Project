import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import {
  createBooking,
  getAllBookings,
  getBookingsByEmail,
  type PaymentMethod,
} from '@/lib/bookings-store';
import { PLATFORM_COMMISSION_RATE } from '@/lib/constants';
import { createCheckoutSession } from '@/lib/stripe/server';
import { Resend } from 'resend';

/**
 * Returns a Supabase service-role client, or null if env vars are not set.
 * Uses the service role key to bypass RLS for server-side booking writes.
 */
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Estimates a nightly/per-person price for a listing based on type and rating.
 * Used when no explicit price_usd is stored (scraped data often lacks pricing).
 */
function estimatePrice(listing: Record<string, unknown> | undefined): number {
  if (!listing) return 60;
  const type = String(listing.type ?? '').toLowerCase();
  const rating = Number(listing.avg_rating ?? listing.rating ?? 0);

  if (type === 'restaurante' || type === 'restaurant') {
    return rating >= 4.5 ? 35 : rating >= 4 ? 27 : 18;
  }
  if (type === 'posada' || type === 'alojamiento' || type === 'hospedaje') {
    return rating >= 4.5 ? 75 : rating >= 4 ? 60 : 40;
  }
  if (type === 'hotel') {
    return rating >= 4.5 ? 185 : rating >= 4 ? 110 : rating >= 3 ? 80 : 60;
  }
  if (type === 'tours' || type === 'experience') {
    return rating >= 4.5 ? 45 : 30;
  }
  return 60;
}

// Load scraped listings for price/capacity lookups
let _listings: Record<string, unknown>[] | null = null;
function getListings() {
  if (_listings) return _listings;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _listings = require('@/data/scraped-listings.json') as unknown as Record<string, unknown>[];
  } catch {
    _listings = [];
  }
  return _listings;
}

const createBookingSchema = z.object({
  listing_id: z.string().min(1),
  check_in: z.string().min(1),
  check_out: z.string().optional(),
  guests: z.number().int().positive().optional(),
  guest_count: z.number().int().positive().optional(),
  guest_name: z.string().min(1),
  guest_email: z.string().email(),
  guest_phone: z.string().optional(),
  special_requests: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
  payment_method: z.enum(['card', 'zelle', 'usdt', 'arrival']).default('card'),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const email = searchParams.get('email');

  // Try Supabase first
  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase.from('guest_bookings').select('*').order('created_at', { ascending: false });
      if (email) query = query.eq('guest_email', email);
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (!error && data) {
        return NextResponse.json({ data, count: data.length });
      }
      console.error('Supabase GET bookings error:', error);
    } catch (err) {
      console.error('Supabase GET bookings exception:', err);
    }
  }

  // JSON fallback
  let bookings = email ? getBookingsByEmail(email) : getAllBookings();
  if (status) bookings = bookings.filter((b) => b.status === status);
  bookings = [...bookings].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return NextResponse.json({ data: bookings, count: bookings.length });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    listing_id,
    check_in,
    check_out,
    guest_name,
    guest_email,
    guest_phone,
    special_requests,
    notes,
    payment_method,
  } = parsed.data;

  const guest_count = parsed.data.guest_count ?? parsed.data.guests ?? 1;

  const listings = getListings();
  const listing = listings.find(
    (l) =>
      l.id === listing_id ||
      (l as { slug?: string }).slug === listing_id
  ) as {
    id?: string;
    name?: string;
    title?: string;
    slug?: string;
    provider_id?: string;
    price_usd?: number;
    price?: number;
    max_guests?: number;
    min_guests?: number;
    phone?: string;
  } | undefined;

  const listing_name = listing?.title ?? listing?.name ?? `Experience ${listing_id}`;
  const listing_slug = (listing as { slug?: string } | undefined)?.slug;
  const provider_id = listing?.provider_id;
  const base_price_usd = listing?.price_usd ?? listing?.price ?? estimatePrice(listing);
  const max_guests = listing?.max_guests ?? 99;
  const min_guests = listing?.min_guests ?? 1;

  if (guest_count < min_guests || guest_count > max_guests) {
    return NextResponse.json(
      { error: `Guest count must be between ${min_guests} and ${max_guests}` },
      { status: 400 }
    );
  }

  const checkIn = new Date(check_in);
  const checkOut = check_out ? new Date(check_out) : checkIn;
  const nights = Math.max(
    1,
    Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  );

  const subtotal_usd = Math.round(base_price_usd * guest_count * nights * 100) / 100;
  const service_fee_usd = Math.round(subtotal_usd * PLATFORM_COMMISSION_RATE * 100) / 100;
  const total_usd = Math.round((subtotal_usd + service_fee_usd) * 100) / 100;
  const commission_usd = service_fee_usd;
  const net_provider_usd = Math.round((total_usd - commission_usd) * 100) / 100;

  // Generate confirmation code upfront so it's consistent across Supabase + JSON paths
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let confirmation_code = 'VZ-';
  for (let i = 0; i < 6; i++) confirmation_code += chars[Math.floor(Math.random() * chars.length)];

  const bookingBase = {
    listing_id,
    listing_name,
    listing_slug,
    provider_id,
    guest_name,
    guest_email,
    guest_phone,
    check_in: checkIn.toISOString().split('T')[0],
    check_out: checkOut.toISOString().split('T')[0],
    guest_count,
    base_price_usd,
    nights,
    subtotal_usd,
    service_fee_usd,
    total_usd,
    commission_usd,
    net_provider_usd,
    status: 'pending' as const,
    payment_method: payment_method as PaymentMethod,
    special_requests,
    notes,
  };

  // Try Supabase first
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let booking: any = null;
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('guest_bookings')
        .insert({ ...bookingBase, confirmation_code })
        .select()
        .single();
      if (!error && data) {
        booking = data;
      } else {
        console.error('Supabase insert booking error:', error);
      }
    } catch (err) {
      console.error('Supabase insert booking exception:', err);
    }
  }

  // JSON fallback if Supabase unavailable or failed
  if (!booking) {
    booking = createBooking(bookingBase);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3111';
  let checkout_url: string | null = null;
  let payment_details: Record<string, string> | null = null;

  if (payment_method === 'card') {
    try {
      const session = await createCheckoutSession({
        bookingId: booking.id,
        listingTitle: listing_name,
        amountUsd: total_usd,
        touristEmail: guest_email,
        successUrl: `${appUrl}/booking/confirmation?id=${booking.id}`,
        cancelUrl: listing_slug ? `${appUrl}/listing/${listing_slug}` : `${appUrl}/`,
        metadata: { bookingId: booking.id },
      });
      checkout_url = session.url;

      // Store session ID on booking
      if (supabase) {
        await supabase
          .from('guest_bookings')
          .update({ stripe_checkout_session_id: session.id })
          .eq('id', booking.id);
      }
      const { updateBookingStatus } = await import('@/lib/bookings-store');
      updateBookingStatus(booking.id, 'pending', {
        stripe_checkout_session_id: session.id,
      });
    } catch (err) {
      console.error('Stripe checkout creation failed:', err);
    }
  } else if (payment_method === 'zelle') {
    payment_details = {
      method: 'Zelle',
      email: process.env.PAYMENT_ZELLE_EMAIL || 'payments@vz-tourism.com',
      name: process.env.PAYMENT_ZELLE_NAME || 'VZ Tourism Platform',
      amount: `$${total_usd.toFixed(2)} USD`,
      reference: booking.confirmation_code as string,
      instructions: `Send exactly $${total_usd.toFixed(2)} via Zelle to the email above. Use your booking code "${booking.confirmation_code}" as the memo. Your booking will be confirmed once payment is verified.`,
    };
  } else if (payment_method === 'usdt') {
    if (!process.env.PAYMENT_USDT_ADDRESS) {
      return NextResponse.json(
        { error: 'USDT payment is not currently available. Please choose another payment method.' },
        { status: 400 }
      );
    }
    payment_details = {
      method: 'USDT (TRC-20)',
      address: process.env.PAYMENT_USDT_ADDRESS,
      network: process.env.PAYMENT_USDT_NETWORK || 'TRC-20',
      amount: `${total_usd.toFixed(2)} USDT`,
      reference: booking.confirmation_code as string,
      instructions: `Send exactly ${total_usd.toFixed(2)} USDT on the TRC-20 network to the address above. Your booking code is "${booking.confirmation_code}". Screenshot your transfer and contact us on WhatsApp to confirm.`,
    };
  } else if (payment_method === 'arrival') {
    payment_details = {
      method: 'Pay on Arrival',
      amount: `$${total_usd.toFixed(2)} USD`,
      reference: booking.confirmation_code as string,
      instructions: `Your booking is reserved. Pay $${total_usd.toFixed(2)} in cash on arrival. Show your booking code "${booking.confirmation_code}" to the provider.`,
    };
  }

  // Send confirmation emails (non-blocking — email failure never fails the booking)
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'bookings@vz-tourism.com';
    const opsEmail = process.env.RESEND_NOTIFY_EMAIL || 'ops@vz-tourism.com';
    const confirmationCode = booking.confirmation_code as string;
    const nextSteps = payment_method === 'card'
      ? 'Complete payment via the checkout link to confirm your booking.'
      : payment_method === 'arrival'
      ? 'Your booking is reserved. Pay on arrival and show your booking code to the provider.'
      : `Transfer ${payment_details?.amount} via ${payment_details?.method} using the details provided. Your booking will be confirmed once payment is verified.`;

    Promise.all([
      resend.emails.send({
        from: fromEmail,
        to: opsEmail,
        subject: `New booking: ${confirmationCode} — ${listing_name}`,
        text: [
          `Booking Reference: ${confirmationCode}`,
          `Listing: ${listing_name}`,
          `Guest: ${guest_name} <${guest_email}>`,
          `Phone: ${guest_phone ?? 'N/A'}`,
          `Check-in: ${check_in}`,
          `Check-out: ${check_out ?? check_in}`,
          `Guests: ${guest_count}`,
          `Payment: ${payment_method} — $${total_usd} USD`,
          `Notes: ${special_requests ?? notes ?? 'None'}`,
        ].join('\n'),
      }),
      resend.emails.send({
        from: fromEmail,
        to: guest_email,
        subject: `Booking confirmed — ${confirmationCode}`,
        text: [
          `Hi ${guest_name},`,
          '',
          `Your booking at ${listing_name} is received.`,
          `Booking reference: ${confirmationCode}`,
          `Check-in: ${check_in}`,
          `Check-out: ${check_out ?? check_in}`,
          `Total: $${total_usd} USD`,
          '',
          nextSteps,
          '',
          'Questions? Reply to this email or contact us on WhatsApp.',
        ].join('\n'),
      }),
    ]).catch((err) => console.error('Resend email error:', err));
  }

  return NextResponse.json(
    {
      data: booking,
      checkout_url,
      payment_details,
      confirmation_code: booking.confirmation_code,
    },
    { status: 201 }
  );
}
