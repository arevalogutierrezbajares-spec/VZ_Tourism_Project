/**
 * Mock Stripe client for integration tests.
 */

export const mockCheckoutSession = {
  id: 'cs_test_abc123',
  url: 'https://checkout.stripe.com/pay/cs_test_abc123',
  payment_status: 'unpaid',
  status: 'open',
  metadata: { bookingId: 'booking-uuid-1' },
};

export const mockStripeClient = {
  checkout: {
    sessions: {
      create: jest.fn().mockResolvedValue(mockCheckoutSession),
      retrieve: jest.fn().mockResolvedValue(mockCheckoutSession),
    },
  },
  paymentIntents: {
    create: jest.fn(),
    retrieve: jest.fn(),
  },
  webhooks: {
    constructEventAsync: jest.fn(),
    constructEvent: jest.fn(),
  },
};

// Mock the stripe/server module
export const mockCreateCheckoutSession = jest.fn().mockResolvedValue(mockCheckoutSession);
export const mockHandleWebhookEvent = jest.fn();
