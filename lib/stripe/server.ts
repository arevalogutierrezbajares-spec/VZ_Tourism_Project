import Stripe from 'stripe';

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-03-25.dahlia',
    });
  }
  return _stripe;
}
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string, unknown>)[prop as string];
  },
});

export interface CreateCheckoutSessionParams {
  bookingId: string;
  listingTitle: string;
  amountUsd: number;
  touristEmail: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export async function createCheckoutSession({
  bookingId,
  listingTitle,
  amountUsd,
  touristEmail,
  successUrl,
  cancelUrl,
  metadata = {},
}: CreateCheckoutSessionParams): Promise<Stripe.Checkout.Session> {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: listingTitle,
            description: `Booking ID: ${bookingId}`,
          },
          unit_amount: Math.round(amountUsd * 100),
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: touristEmail,
    metadata: {
      booking_id: bookingId,
      ...metadata,
    },
    payment_intent_data: {
      metadata: {
        booking_id: bookingId,
      },
    },
  });

  return session;
}

export async function handleWebhookEvent(
  body: string,
  signature: string
): Promise<{ type: string; data: Stripe.Event.Data }> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
  }
  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    webhookSecret
  );

  return {
    type: event.type,
    data: event.data,
  };
}

export async function createConnectedAccount(email: string): Promise<Stripe.Account> {
  return await stripe.accounts.create({
    type: 'express',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
}

export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<Stripe.AccountLink> {
  return await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
}

export async function createTransfer(
  amountUsd: number,
  destinationAccountId: string,
  bookingId: string
): Promise<Stripe.Transfer> {
  return await stripe.transfers.create({
    amount: Math.round(amountUsd * 100),
    currency: 'usd',
    destination: destinationAccountId,
    metadata: { booking_id: bookingId },
  });
}
