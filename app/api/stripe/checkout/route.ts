import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession } from '@/lib/stripe/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { bookingId, successUrl, cancelUrl } = body;

  if (!bookingId) return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, listing:listings(title, cover_image_url), tourist:users(email)')
    .eq('id', bookingId)
    .eq('tourist_id', user.id)
    .single();

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (booking.status !== 'pending') {
    return NextResponse.json({ error: 'Booking is not pending payment' }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const session = await createCheckoutSession({
      bookingId,
      listingTitle: booking.listing?.title || 'Tourism Experience',
      amountUsd: booking.total_usd,
      touristEmail: booking.tourist?.email || user.email!,
      successUrl: successUrl || `${appUrl}/booking/${bookingId}/success`,
      cancelUrl: cancelUrl || `${appUrl}/listing/${booking.listing?.slug || ''}`,
      metadata: { bookingId, userId: user.id },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create checkout session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
