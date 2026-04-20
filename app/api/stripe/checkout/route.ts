import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession, stripe } from '@/lib/stripe/server';
import { getBooking, updateBookingStatus } from '@/lib/bookings-store';
import { createClient, createServiceClient } from '@/lib/supabase/server';

interface CheckoutBooking {
  listing_name: string;
  listing_slug?: string | null;
  guest_email: string;
  total_usd: number;
  status: string;
  stripe_checkout_session_id?: string | null;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { bookingId, successUrl, cancelUrl, discountCode } = body as {
    bookingId?: string;
    successUrl?: string;
    cancelUrl?: string;
    discountCode?: string;
  };

  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
  }

  // Authenticate — must be logged in to create a Stripe session
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // P1-BOK-006: look up booking in file store first, fall back to Supabase
  let booking: CheckoutBooking | null = getBooking(bookingId) as CheckoutBooking | null;
  if (!booking) {
    const { data: sbBooking } = await supabase
      .from('guest_bookings')
      .select('listing_name, listing_slug, guest_email, total_usd, status, stripe_checkout_session_id')
      .eq('id', bookingId)
      .single();
    if (sbBooking) booking = sbBooking as CheckoutBooking;
  }
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  if (booking.status !== 'pending') {
    return NextResponse.json({ error: 'Booking is not pending payment' }, { status: 400 });
  }

  if (booking.guest_email !== user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Apply discount code before creating Stripe session
  let chargeAmount = booking.total_usd;
  let discountCodeId: string | undefined;
  let discountAmountUsd = 0;

  if (discountCode?.trim()) {
    try {
      const validateRes = await fetch(
        new URL('/api/discount-codes/validate', request.url).href,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: discountCode.trim(), booking_total_usd: booking.total_usd }),
        }
      );
      if (validateRes.ok) {
        const validation = await validateRes.json();
        if (validation.valid) {
          chargeAmount = validation.net_total_usd;
          discountCodeId = validation.code_id;
          discountAmountUsd = validation.discount_amount_usd;
        }
      }
      // If validation fails or code is invalid, proceed with original price (silent degradation)
    } catch {
      // Validation service unavailable — proceed without discount
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3111';
  const resolvedSuccessUrl = successUrl || `${appUrl}/booking/confirmation?id=${bookingId}`;
  const resolvedCancelUrl =
    cancelUrl ||
    (booking.listing_slug ? `${appUrl}/listing/${booking.listing_slug}` : `${appUrl}/`);

  // P1-BOK-007: $0 after discount — skip Stripe, confirm booking directly
  if (chargeAmount === 0) {
    const serviceClient = await createServiceClient();
    if (serviceClient) {
      await serviceClient
        .from('guest_bookings')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', bookingId);
    }
    updateBookingStatus(bookingId, 'confirmed', {
      ...(discountCodeId ? { discount_code_id: discountCodeId, discount_amount_usd: discountAmountUsd } : {}),
    });
    return NextResponse.json({ sessionId: null, url: resolvedSuccessUrl });
  }

  try {
    const session = await createCheckoutSession({
      bookingId,
      listingTitle: booking.listing_name,
      amountUsd: chargeAmount,
      touristEmail: booking.guest_email,
      successUrl: resolvedSuccessUrl,
      cancelUrl: resolvedCancelUrl,
      metadata: {
        bookingId,
        ...(discountCodeId ? { discount_code_id: discountCodeId } : {}),
      },
    });

    updateBookingStatus(bookingId, 'pending', {
      stripe_checkout_session_id: session.id,
      ...(discountCodeId ? { discount_code_id: discountCodeId, discount_amount_usd: discountAmountUsd } : {}),
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create checkout session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
