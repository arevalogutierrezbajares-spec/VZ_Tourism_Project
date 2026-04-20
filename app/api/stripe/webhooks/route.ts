import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { handleWebhookEvent } from '@/lib/stripe/server';
import { updateBookingStatus, updateBookingBySessionId, getBooking } from '@/lib/bookings-store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateSupabaseBooking(supabase: any, id: string, status: string, extra: Record<string, unknown> = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any)
    .from('guest_bookings')
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq('id', id);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateSupabaseBookingBySession(supabase: any, sessionId: string, status: string, extra: Record<string, unknown> = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any)
    .from('guest_bookings')
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq('stripe_checkout_session_id', sessionId);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: { type: string; data: { object: any } };
  try {
    event = await handleWebhookEvent(body, sig);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = await createServiceClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as {
          id?: string;
          metadata?: { bookingId?: string; booking_id?: string; discount_code_id?: string };
          payment_intent?: string;
        };
        const bookingId = session.metadata?.bookingId || session.metadata?.booking_id;
        const discountCodeId = session.metadata?.discount_code_id;
        const extra = { payment_intent_id: session.payment_intent as string | undefined };

        if (bookingId) {
          if (supabase) await updateSupabaseBooking(supabase, bookingId, 'confirmed', extra);
          updateBookingStatus(bookingId, 'confirmed', extra);
        } else if (session.id) {
          if (supabase) await updateSupabaseBookingBySession(supabase, session.id, 'confirmed', extra);
          updateBookingBySessionId(session.id, 'confirmed', extra);
        }

        // Record discount code usage and increment counter atomically
        if (supabase && discountCodeId && bookingId) {
          const booking = getBooking(bookingId);
          const discountAmount = booking?.discount_amount_usd ?? 0;

          // Check for existing use record (idempotency)
          const { data: existingUse } = await supabase
            .from('discount_code_uses')
            .select('id')
            .eq('guest_booking_id', bookingId)
            .maybeSingle();

          if (!existingUse) {
            // Only insert and increment if no use record exists
            await Promise.allSettled([
              supabase.from('discount_code_uses').insert({
                code_id: discountCodeId,
                guest_booking_id: bookingId,
                discount_amount_usd: discountAmount,
              }),
              supabase.rpc('increment_discount_code_use', {
                p_code_id: discountCodeId,
                p_revenue: discountAmount,
              }),
            ]);
          }
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as {
          id?: string;
          metadata?: { bookingId?: string; booking_id?: string };
        };
        const bookingId = session.metadata?.bookingId || session.metadata?.booking_id;
        if (bookingId) {
          // Only cancel if still pending
          if (supabase) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
              .from('guest_bookings')
              .update({ status: 'cancelled', updated_at: new Date().toISOString() })
              .eq('id', bookingId)
              .eq('status', 'pending');
          }
          const booking = getBooking(bookingId);
          if (booking?.status === 'pending') updateBookingStatus(bookingId, 'cancelled');
        } else if (session.id) {
          if (supabase) await updateSupabaseBookingBySession(supabase, session.id, 'cancelled');
          updateBookingBySessionId(session.id, 'cancelled');
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const pi = event.data.object as {
          id?: string;
          metadata?: { bookingId?: string; booking_id?: string };
        };
        const bookingId = pi.metadata?.bookingId || pi.metadata?.booking_id;
        if (bookingId) {
          const extra = { payment_intent_id: pi.id };
          if (supabase) await updateSupabaseBooking(supabase, bookingId, 'confirmed', extra);
          updateBookingStatus(bookingId, 'confirmed', extra);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as {
          metadata?: { bookingId?: string; booking_id?: string };
        };
        const bookingId = pi.metadata?.bookingId || pi.metadata?.booking_id;
        if (bookingId) {
          if (supabase) await updateSupabaseBooking(supabase, bookingId, 'cancelled');
          updateBookingStatus(bookingId, 'cancelled');
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as {
          metadata?: { bookingId?: string; booking_id?: string };
        };
        const bookingId = charge.metadata?.bookingId || charge.metadata?.booking_id;
        if (bookingId) {
          if (supabase) await updateSupabaseBooking(supabase, bookingId, 'cancelled');
          updateBookingStatus(bookingId, 'cancelled');
        }
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
