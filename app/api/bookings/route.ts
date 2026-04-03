import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createBooking,
  getAllBookings,
  getBookingsByEmail,
  type PaymentMethod,
} from '@/lib/bookings-store';
import { PLATFORM_COMMISSION_RATE } from '@/lib/constants';
import { createCheckoutSession } from '@/lib/stripe/server';

/**
 * Estimates a nightly/per-person price for a listing based on type and rating.
 * Used when no explicit price_usd is stored (scraped data often lacks pricing).
 */
function estimatePrice(listing: Record<string, unknown> | undefined): number {
  if (!listing) return 60;
  const type = String(listing.type ?? '').toLowerCase();
  const rating = Number(listing.avg_rating ?? listing.rating ?? 0);

  if (type === 'restaurante' || type === 'restaurant') {
    // Restaurants: $15-40/person
    return rating >= 4.5 ? 35 : rating >= 4 ? 27 : 18;
  }
  if (type === 'posada' || type === 'alojamiento' || type === 'hospedaje') {
    // Posadas: $40-80/night
    return rating >= 4.5 ? 75 : rating >= 4 ? 60 : 40;
  }
  if (type === 'hotel') {
    // Hotels: $60-250/night based on rating
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
    _listings = require('@/data/scraped-listings.json') as Record<string, unknown>[];
  } catch {
    _listings = [];
  }
  return _listings;
}

const createBookingSchema = z.object({
  listing_id: z.string().min(1),
  check_in: z.string().min(1),
  check_out: z.string().optional(),
  // Accept both 'guests' (old) and 'guest_count' (new)
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

  let bookings = email ? getBookingsByEmail(email) : getAllBookings();
  if (status) bookings = bookings.filter((b) => b.status === status);

  // Sort newest first
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

  // Look up listing for price + capacity info
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

  const booking = createBooking({
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
    status: 'pending',
    payment_method: payment_method as PaymentMethod,
    special_requests,
    notes,
  });

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
      const { updateBookingStatus } = await import('@/lib/bookings-store');
      updateBookingStatus(booking.id, 'pending', {
        stripe_checkout_session_id: session.id,
      });
    } catch (err) {
      console.error('Stripe checkout creation failed:', err);
      // Don't fail the booking — tourist can retry payment from confirmation page
    }
  } else if (payment_method === 'zelle') {
    payment_details = {
      method: 'Zelle',
      email: process.env.PAYMENT_ZELLE_EMAIL || 'payments@vz-tourism.com',
      name: process.env.PAYMENT_ZELLE_NAME || 'VZ Tourism Platform',
      amount: `$${total_usd.toFixed(2)} USD`,
      reference: booking.confirmation_code,
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
      reference: booking.confirmation_code,
      instructions: `Send exactly ${total_usd.toFixed(2)} USDT on the TRC-20 network to the address above. Your booking code is "${booking.confirmation_code}". Screenshot your transfer and contact us on WhatsApp to confirm.`,
    };
  } else if (payment_method === 'arrival') {
    payment_details = {
      method: 'Pay on Arrival',
      amount: `$${total_usd.toFixed(2)} USD`,
      reference: booking.confirmation_code,
      instructions: `Your booking is reserved. Pay $${total_usd.toFixed(2)} in cash on arrival. Show your booking code "${booking.confirmation_code}" to the provider.`,
    };
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
