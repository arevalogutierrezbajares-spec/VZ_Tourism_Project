import { NextRequest, NextResponse } from 'next/server';
import { handleWebhookEvent } from '@/lib/stripe/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event;
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
        const session = event.data.object as { metadata?: { bookingId?: string } };
        const bookingId = session.metadata?.bookingId;
        if (bookingId) {
          await supabase
            .from('bookings')
            .update({ status: 'confirmed', updated_at: new Date().toISOString() })
            .eq('id', bookingId);
        }
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object as { metadata?: { bookingId?: string } };
        const bookingId = session.metadata?.bookingId;
        if (bookingId) {
          await supabase
            .from('bookings')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('id', bookingId)
            .eq('status', 'pending');
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as { metadata?: { bookingId?: string } };
        const bookingId = pi.metadata?.bookingId;
        if (bookingId) {
          await supabase
            .from('bookings')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('id', bookingId);
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
