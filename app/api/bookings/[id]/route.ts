import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBooking, updateBookingStatus, type BookingStatus } from '@/lib/bookings-store';
import { stripe } from '@/lib/stripe/server';

// Lazy-load scraped listings for cover image enrichment
let _listings: Record<string, string | null>[] | null = null;
async function getListings(): Promise<Record<string, string | null>[]> {
  if (_listings) return _listings;
  try {
    const mod = await import('@/data/scraped-listings.json');
    _listings = (mod.default ?? mod) as unknown as Record<string, string | null>[];
  } catch {
    _listings = [];
  }
  return _listings;
}

async function enrichBooking(booking: Record<string, unknown>) {
  const listings = await getListings();
  const listing = listings.find(
    (l) => l.id === booking.listing_id || l.slug === booking.listing_slug
  );
  return {
    ...booking,
    cover_image_url: booking.cover_image_url ?? listing?.cover_image_url ?? null,
    provider_phone: listing?.phone ?? null,
  };
}

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;

  // Authenticate using cookie-based SSR client
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Try Supabase first — verify booking belongs to authenticated user
  try {
    const { data, error } = await supabase
      .from('guest_bookings')
      .select('*')
      .eq('id', id)
      .single();
    if (!error && data) {
      if ((data as Record<string, unknown>).guest_email !== user.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.json({ data: await enrichBooking(data as Record<string, unknown>) });
    }
    if (error?.code !== 'PGRST116') console.error('Supabase GET booking error:', error);
  } catch (err) {
    console.error('Supabase GET booking exception:', err);
  }

  // JSON fallback — verify booking belongs to authenticated user
  const booking = getBooking(id);
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (booking.guest_email !== user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ data: await enrichBooking(booking as unknown as Record<string, unknown>) });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;

  // Authenticate using cookie-based SSR client
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { status, notes, special_requests } = body as {
    status?: BookingStatus;
    notes?: string;
    special_requests?: string;
  };

  const validStatuses: BookingStatus[] = [
    'pending',
    'confirmed',
    'cancelled',
    'completed',
    'payment_submitted',
  ];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  if (special_requests !== undefined) updates.special_requests = special_requests;

  // Determine user role for ownership checks
  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  const isProvider = userProfile?.role === 'provider';

  // Try Supabase first — verify booking belongs to authenticated user (or provider owns listing) before updating
  try {
    // First verify ownership (also fetch fields needed for refund logic)
    const { data: existing, error: fetchError } = await supabase
      .from('guest_bookings')
      .select('guest_email, listing_id, status, payment_intent_id, stripe_checkout_session_id, total_usd')
      .eq('id', id)
      .single();
    if (fetchError?.code === 'PGRST116' || !existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const existingRow = existing as Record<string, unknown>;
    let authorized = existingRow.guest_email === user.email;

    // Provider path: check that the authenticated provider owns the listing
    if (!authorized && isProvider) {
      const { data: providerRow } = await supabase
        .from('providers')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (providerRow) {
        const { data: listingRow } = await supabase
          .from('listings')
          .select('provider_id')
          .eq('id', existingRow.listing_id as string)
          .single();
        if (listingRow && (listingRow as Record<string, unknown>).provider_id === providerRow.id) {
          authorized = true;
        }
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // P1-BOK-005: issue Stripe refund when provider cancels a confirmed, card-paid booking
    if (status === 'cancelled' && isProvider) {
      const existingFull = existing as Record<string, unknown>;
      if (existingFull.status === 'confirmed') {
        const paymentIntentId = existingFull.payment_intent_id as string | null;
        const sessionId = existingFull.stripe_checkout_session_id as string | null;
        // Retrieve payment_intent_id from session if not stored directly
        let refundTarget = paymentIntentId;
        if (!refundTarget && sessionId) {
          try {
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            refundTarget = typeof session.payment_intent === 'string' ? session.payment_intent : null;
          } catch (sessionErr) {
            console.error('Stripe session retrieve error:', sessionErr);
          }
        }
        if (refundTarget) {
          try {
            await stripe.refunds.create({ payment_intent: refundTarget });
          } catch (refundErr) {
            console.error('Stripe refund failed (booking will still be cancelled):', refundErr);
          }
        }
      }
    }

    const { data, error } = await supabase
      .from('guest_bookings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (!error && data) return NextResponse.json({ data });
    if (error?.code !== 'PGRST116') console.error('Supabase PATCH booking error:', error);
  } catch (err) {
    console.error('Supabase PATCH booking exception:', err);
  }

  // JSON fallback — verify booking belongs to authenticated user
  const booking = getBooking(id);
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (booking.guest_email !== user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const extraUpdates: Partial<typeof booking> = {};
  if (notes !== undefined) extraUpdates.notes = notes;
  if (special_requests !== undefined) extraUpdates.special_requests = special_requests;

  const updated = updateBookingStatus(id, status ?? booking.status, extraUpdates);
  return NextResponse.json({ data: updated });
}
