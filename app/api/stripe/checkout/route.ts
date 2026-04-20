import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe/server';
import { getBooking, updateBookingStatus } from '@/lib/bookings-store';
import { createClient } from '@/lib/supabase/server';

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

  const booking = getBooking(bookingId);
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }
  if (booking.status !== 'pending') {
    return NextResponse.json({ error: 'Booking is not pending payment' }, { status: 400 });
  }

  // Ownership check — verify the authenticated user owns this booking
  const supabase = await createClient();
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (booking.guest_email !== user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
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

  try {
    const session = await createCheckoutSession({
      bookingId,
      listingTitle: booking.listing_name,
      amountUsd: chargeAmount,
      touristEmail: booking.guest_email,
      successUrl: successUrl || `${appUrl}/booking/confirmation?id=${bookingId}`,
      cancelUrl:
        cancelUrl ||
        (booking.listing_slug ? `${appUrl}/listing/${booking.listing_slug}` : `${appUrl}/`),
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
