import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingForm } from '@/components/listing/BookingForm';
import { mockListing } from '@/__tests__/fixtures';
import type { Listing } from '@/types/database';

// ─── Mock function references (hoisted before jest.mock) ──────────────────────

const mockNextStep = jest.fn();
const mockPrevStep = jest.fn();
const mockUpdateFormData = jest.fn();
const mockSubmitBooking = jest.fn();
const mockHandleCardPayment = jest.fn();
const mockHandleManualPaymentConfirm = jest.fn();
const mockHandleArrivalBooking = jest.fn();
const mockGetNights = jest.fn(() => 2);
const mockGetSubtotal = jest.fn(() => 340);
const mockGetServiceFee = jest.fn(() => 40.8);
const mockGetTotal = jest.fn(() => 380.8);

const baseFormData = {
  listing_id: 'listing-uuid-1',
  check_in: '',
  check_out: '',
  guest_count: 2,
  guest_name: '',
  guest_email: '',
  guest_phone: '',
  special_requests: '',
  payment_method: 'card' as const,
};

// ─── Mock hooks ────────────────────────────────────────────────────────────────

jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(() => ({
    isAuthenticated: true,
    user: { id: 'user-1', email: 'test@example.com' },
    loading: false,
    profile: null,
  })),
}));

jest.mock('@/stores/auth-store', () => ({
  useAuthStore: Object.assign(jest.fn(() => ({
    user: null,
    profile: null,
    loading: false,
    initialized: true,
    setUser: jest.fn(),
    setProfile: jest.fn(),
    setLoading: jest.fn(),
    setInitialized: jest.fn(),
    signOut: jest.fn(),
    updateProfile: jest.fn(),
  })), {
    getState: jest.fn(() => ({
      user: null,
      profile: null,
    })),
  }),
}));

jest.mock('@/hooks/use-booking', () => ({
  useBooking: jest.fn(() => ({
    step: 'select',
    formData: { ...baseFormData },
    isLoading: false,
    booking: null,
    paymentDetails: null,
    updateFormData: mockUpdateFormData,
    nextStep: mockNextStep,
    prevStep: mockPrevStep,
    getNights: mockGetNights,
    getSubtotal: mockGetSubtotal,
    getServiceFee: mockGetServiceFee,
    getTotal: mockGetTotal,
    submitBooking: mockSubmitBooking,
    handleCardPayment: mockHandleCardPayment,
    handleManualPaymentConfirm: mockHandleManualPaymentConfirm,
    handleArrivalBooking: mockHandleArrivalBooking,
  })),
}));

// ─── Mock child components ─────────────────────────────────────────────────────

jest.mock('@/components/listing/AvailabilityCalendar', () => ({
  AvailabilityCalendar: ({ onRangeSelect }: { onRangeSelect?: (checkIn: string, checkOut: string | null) => void }) => (
    <div data-testid="availability-calendar">
      <button
        data-testid="select-dates-btn"
        onClick={() => onRangeSelect?.('2026-04-15', '2026-04-17')}
      >
        Select April 15-17
      </button>
    </div>
  ),
}));

jest.mock('@/components/common/PriceDisplay', () => ({
  PriceDisplay: ({ priceUsd }: { priceUsd: number }) => (
    <span data-testid="price-display">${priceUsd}</span>
  ),
}));

jest.mock('@/components/common/AuthModal', () => ({
  AuthModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="auth-modal">
        <button onClick={onClose}>Close auth</button>
      </div>
    ) : null,
}));

// Import the mock after jest.mock so we can control return values
import { useBooking } from '@/hooks/use-booking';
import { useAuth } from '@/hooks/use-auth';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function setStep(
  step: string,
  formOverrides?: Record<string, unknown>,
  hookOverrides?: Record<string, unknown>
) {
  (useBooking as jest.Mock).mockReturnValue({
    step,
    formData: { ...baseFormData, ...formOverrides },
    isLoading: false,
    booking: null,
    paymentDetails: null,
    updateFormData: mockUpdateFormData,
    nextStep: mockNextStep,
    prevStep: mockPrevStep,
    getNights: mockGetNights,
    getSubtotal: mockGetSubtotal,
    getServiceFee: mockGetServiceFee,
    getTotal: mockGetTotal,
    submitBooking: mockSubmitBooking,
    handleCardPayment: mockHandleCardPayment,
    handleManualPaymentConfirm: mockHandleManualPaymentConfirm,
    handleArrivalBooking: mockHandleArrivalBooking,
    ...hookOverrides,
  });
}

function renderBookingForm(listingOverrides?: Partial<Listing>) {
  const listing = { ...mockListing, ...listingOverrides } as Listing;
  return render(<BookingForm listing={listing} />);
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('BookingForm — Step 1: Date Selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setStep('select');
  });

  it('renders the calendar and guest controls', () => {
    renderBookingForm();
    expect(screen.getByTestId('availability-calendar')).toBeInTheDocument();
    expect(screen.getByText('Guests')).toBeInTheDocument();
  });

  it('displays the listing price', () => {
    renderBookingForm();
    expect(screen.getByTestId('price-display')).toHaveTextContent('$85');
  });

  it('renders all step labels in indicator', () => {
    renderBookingForm();
    expect(screen.getByText('Dates')).toBeInTheDocument();
    expect(screen.getByText('Your Info')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Payment')).toBeInTheDocument();
  });

  it('disables Continue when no date is selected', () => {
    renderBookingForm();
    const btn = screen.getByRole('button', { name: /continue/i });
    expect(btn).toBeDisabled();
  });

  it('enables Continue when a check-in date is selected', () => {
    setStep('select', { check_in: '2026-04-15', check_out: '2026-04-17' });
    renderBookingForm();
    const btn = screen.getByRole('button', { name: /continue/i });
    expect(btn).not.toBeDisabled();
  });

  it('shows summary text when date is selected', () => {
    setStep('select', { check_in: '2026-04-15', check_out: '2026-04-17' });
    renderBookingForm();
    // Summary shows nights, guest count, and total (multiple elements may match)
    const nightElements = screen.getAllByText(/night/);
    expect(nightElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/\$380\.80/)).toBeInTheDocument();
  });

  it('calls updateFormData when + guest button is clicked', () => {
    renderBookingForm();
    fireEvent.click(screen.getByText('+'));
    expect(mockUpdateFormData).toHaveBeenCalledWith(
      expect.objectContaining({ guest_count: expect.any(Number) })
    );
  });

  it('disables - guest button at minimum guests', () => {
    setStep('select', { guest_count: 2 });
    renderBookingForm({ min_guests: 2 });
    const minusBtn = screen.getByText('\u2212'); // Unicode minus
    expect(minusBtn.closest('button')).toBeDisabled();
  });

  it('disables + guest button at maximum guests', () => {
    setStep('select', { guest_count: 10 });
    renderBookingForm({ max_guests: 10 });
    const plusBtn = screen.getByText('+');
    expect(plusBtn.closest('button')).toBeDisabled();
  });

  it('calls onRangeSelect from calendar and updates form', () => {
    renderBookingForm();
    fireEvent.click(screen.getByTestId('select-dates-btn'));
    expect(mockUpdateFormData).toHaveBeenCalledWith({
      check_in: '2026-04-15',
      check_out: '2026-04-17',
    });
  });

  it('shows sign-in text when user is not authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      user: null,
      loading: false,
      profile: null,
    });
    setStep('select', { check_in: '2026-04-15' });
    renderBookingForm();
    expect(screen.getByText(/sign in required/i)).toBeInTheDocument();
    // Restore
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', email: 'test@example.com' },
      loading: false,
      profile: null,
    });
  });
});

describe('BookingForm — Step 2: Guest Details', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setStep('details', {
      check_in: '2026-04-15',
      check_out: '2026-04-17',
      guest_name: '',
      guest_email: '',
    });
  });

  it('renders name, email, phone, and special requests fields', () => {
    renderBookingForm();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/whatsapp/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/special requests/i)).toBeInTheDocument();
  });

  it('renders Back and Continue buttons', () => {
    renderBookingForm();
    expect(screen.getByText('Back')).toBeInTheDocument();
    expect(screen.getByText('Continue')).toBeInTheDocument();
  });

  it('disables Continue when name and email are empty', () => {
    renderBookingForm();
    const continueBtn = screen.getByText('Continue');
    expect(continueBtn.closest('button')).toBeDisabled();
  });

  it('enables Continue when name and email are filled', () => {
    setStep('details', {
      check_in: '2026-04-15',
      check_out: '2026-04-17',
      guest_name: 'Maria Garcia',
      guest_email: 'maria@example.com',
    });
    renderBookingForm();
    const continueBtn = screen.getByText('Continue');
    expect(continueBtn.closest('button')).not.toBeDisabled();
  });

  it('calls prevStep when Back is clicked', () => {
    renderBookingForm();
    fireEvent.click(screen.getByText('Back'));
    expect(mockPrevStep).toHaveBeenCalledTimes(1);
  });

  it('calls nextStep when Continue is clicked with valid data', () => {
    setStep('details', {
      check_in: '2026-04-15',
      check_out: '2026-04-17',
      guest_name: 'Maria Garcia',
      guest_email: 'maria@example.com',
    });
    renderBookingForm();
    fireEvent.click(screen.getByText('Continue'));
    expect(mockNextStep).toHaveBeenCalledTimes(1);
  });

  it('calls updateFormData when typing in the name field', () => {
    renderBookingForm();
    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Maria' },
    });
    expect(mockUpdateFormData).toHaveBeenCalledWith({ guest_name: 'Maria' });
  });

  it('calls updateFormData when typing in the email field', () => {
    renderBookingForm();
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@test.com' },
    });
    expect(mockUpdateFormData).toHaveBeenCalledWith({ guest_email: 'test@test.com' });
  });

  it('shows validation error when name field is blurred while empty', () => {
    renderBookingForm();
    const nameInput = screen.getByLabelText(/full name/i);
    fireEvent.blur(nameInput);
    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });

  it('shows validation error when email field is blurred while empty', () => {
    renderBookingForm();
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.blur(emailInput);
    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });

  it('shows invalid email error for email without @', () => {
    setStep('details', {
      check_in: '2026-04-15',
      check_out: '2026-04-17',
      guest_name: '',
      guest_email: 'invalidemail',
    });
    renderBookingForm();
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.blur(emailInput);
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
  });
});

describe('BookingForm — Step 3: Review Order', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setStep('review', {
      check_in: '2026-04-15',
      check_out: '2026-04-17',
      guest_count: 2,
      guest_name: 'Maria Garcia',
      guest_email: 'maria@example.com',
      guest_phone: '+1-555-0100',
    });
  });

  it('displays the listing title', () => {
    renderBookingForm();
    expect(screen.getByText(mockListing.title)).toBeInTheDocument();
  });

  it('shows check-in and check-out info', () => {
    renderBookingForm();
    expect(screen.getByText('Check-in')).toBeInTheDocument();
    expect(screen.getByText('Check-out')).toBeInTheDocument();
  });

  it('displays guest name and email in summary', () => {
    renderBookingForm();
    expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
    expect(screen.getByText('maria@example.com')).toBeInTheDocument();
  });

  it('displays guest phone when provided', () => {
    renderBookingForm();
    expect(screen.getByText('+1-555-0100')).toBeInTheDocument();
  });

  it('hides phone row when guest_phone is empty', () => {
    setStep('review', {
      check_in: '2026-04-15',
      check_out: '2026-04-17',
      guest_count: 2,
      guest_name: 'Maria Garcia',
      guest_email: 'maria@example.com',
      guest_phone: '',
    });
    renderBookingForm();
    expect(screen.queryByText('Phone')).not.toBeInTheDocument();
  });

  it('shows price summary with subtotal, fee, and total', () => {
    renderBookingForm();
    expect(screen.getByText(/Service fee/)).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('shows cancellation policy when present', () => {
    renderBookingForm();
    expect(screen.getByText(/cancellation policy/i)).toBeInTheDocument();
  });

  it('shows "Request to Book" for unverified provider', () => {
    renderBookingForm();
    expect(screen.getByText('Request to Book')).toBeInTheDocument();
  });

  it('shows "Book Now" for verified provider', () => {
    renderBookingForm({
      provider: {
        id: 'p1',
        user_id: 'u1',
        business_name: 'Test',
        description: 'Test',
        region: 'Merida',
        is_verified: true,
        rating: 4.5,
        total_reviews: 10,
        logo_url: null,
        whatsapp_number: null,
        created_at: '',
        updated_at: '',
      } as any,
    });
    expect(screen.getByText('Book Now')).toBeInTheDocument();
  });

  it('shows "Instant confirmation" badge for verified provider', () => {
    renderBookingForm({
      provider: {
        id: 'p1',
        user_id: 'u1',
        business_name: 'Test',
        description: 'Test',
        region: 'Merida',
        is_verified: true,
        rating: 4.5,
        total_reviews: 10,
        logo_url: null,
        whatsapp_number: null,
        created_at: '',
        updated_at: '',
      } as any,
    });
    expect(screen.getByText(/instant confirmation/i)).toBeInTheDocument();
  });

  it('shows "Provider confirms within 24h" for non-instant booking', () => {
    renderBookingForm();
    expect(screen.getByText(/provider confirms within 24h/i)).toBeInTheDocument();
  });

  it('calls submitBooking when Book Now / Request to Book is clicked', () => {
    mockSubmitBooking.mockResolvedValue({ id: 'booking-1', confirmation_code: 'ABC', total_usd: 380.8, status: 'pending' });
    renderBookingForm();
    fireEvent.click(screen.getByText('Request to Book'));
    expect(mockSubmitBooking).toHaveBeenCalledTimes(1);
  });

  it('shows loading state while submitting', () => {
    setStep(
      'review',
      {
        check_in: '2026-04-15',
        check_out: '2026-04-17',
        guest_count: 2,
        guest_name: 'Maria Garcia',
        guest_email: 'maria@example.com',
      },
      { isLoading: true }
    );
    renderBookingForm();
    expect(screen.getByText('Sending request...')).toBeInTheDocument();
  });

  it('calls prevStep when Back is clicked on review step', () => {
    renderBookingForm();
    fireEvent.click(screen.getByText('Back'));
    expect(mockPrevStep).toHaveBeenCalledTimes(1);
  });

  it('renders promo code toggle', () => {
    renderBookingForm();
    expect(screen.getByText(/have a promo code/i)).toBeInTheDocument();
  });
});

describe('BookingForm — Step 4: Payment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setStep('payment', {
      check_in: '2026-04-15',
      check_out: '2026-04-17',
      guest_count: 2,
      guest_name: 'Maria Garcia',
      guest_email: 'maria@example.com',
      payment_method: 'card',
    });
  });

  it('renders all 4 payment method options', () => {
    renderBookingForm();
    expect(screen.getByText('Credit / Debit Card')).toBeInTheDocument();
    expect(screen.getByText('Zelle')).toBeInTheDocument();
    expect(screen.getByText('USDT (TRC-20)')).toBeInTheDocument();
    expect(screen.getByText('Pay on Arrival')).toBeInTheDocument();
  });

  it('highlights the selected payment method (card by default)', () => {
    renderBookingForm();
    // Card should be selected (border-primary class)
    const cardButton = screen.getByText('Credit / Debit Card').closest('button');
    expect(cardButton?.className).toContain('border-primary');
  });

  it('calls updateFormData when switching payment method', () => {
    renderBookingForm();
    fireEvent.click(screen.getByText('Zelle'));
    expect(mockUpdateFormData).toHaveBeenCalledWith({ payment_method: 'zelle' });
  });

  it('shows correct pay button text for card payment', () => {
    renderBookingForm();
    expect(screen.getByText(/Pay \$/)).toBeInTheDocument();
  });

  it('shows "Confirm Reservation" for pay-on-arrival', () => {
    setStep('payment', {
      check_in: '2026-04-15',
      check_out: '2026-04-17',
      guest_count: 2,
      guest_name: 'Maria Garcia',
      guest_email: 'maria@example.com',
      payment_method: 'arrival',
    });
    renderBookingForm();
    expect(screen.getByText('Confirm Reservation')).toBeInTheDocument();
  });

  it('shows "I\'ve Sent the Payment" for Zelle', () => {
    setStep('payment', {
      check_in: '2026-04-15',
      check_out: '2026-04-17',
      guest_count: 2,
      guest_name: 'Maria Garcia',
      guest_email: 'maria@example.com',
      payment_method: 'zelle',
    });
    renderBookingForm();
    expect(screen.getByText("I've Sent the Payment")).toBeInTheDocument();
  });

  it('shows payment details for Zelle when available', () => {
    setStep(
      'payment',
      {
        check_in: '2026-04-15',
        check_out: '2026-04-17',
        guest_count: 2,
        guest_name: 'Maria Garcia',
        guest_email: 'maria@example.com',
        payment_method: 'zelle',
      },
      {
        booking: { id: 'b1', confirmation_code: 'XYZ', total_usd: 380.8, status: 'pending' },
        paymentDetails: {
          method: 'zelle',
          email: 'pay@example.com',
          amount: '$380.80',
          reference: 'VAV-XYZ',
          instructions: 'Send via Zelle and include the reference.',
        },
      }
    );
    renderBookingForm();
    expect(screen.getByText('Send payment to:')).toBeInTheDocument();
    expect(screen.getByText('pay@example.com')).toBeInTheDocument();
    expect(screen.getByText('VAV-XYZ')).toBeInTheDocument();
  });

  it('renders price summary on payment step', () => {
    renderBookingForm();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText(/Service fee/)).toBeInTheDocument();
  });

  it('shows "No fees" badge on Zelle option', () => {
    renderBookingForm();
    expect(screen.getByText('No fees')).toBeInTheDocument();
  });

  it('shows "Zero fees" badge on USDT option', () => {
    renderBookingForm();
    expect(screen.getByText('Zero fees')).toBeInTheDocument();
  });

  it('renders back button and navigates to review', () => {
    renderBookingForm();
    const backBtn = screen.getByLabelText('Go back to review');
    fireEvent.click(backBtn);
    expect(mockPrevStep).toHaveBeenCalledTimes(1);
  });

  it('shows loading state during payment processing', () => {
    setStep(
      'payment',
      {
        check_in: '2026-04-15',
        check_out: '2026-04-17',
        guest_count: 2,
        guest_name: 'Maria Garcia',
        guest_email: 'maria@example.com',
        payment_method: 'card',
      },
      { isLoading: true }
    );
    renderBookingForm();
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });
});

describe('BookingForm — Step 5: Done', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setStep('done');
  });

  it('displays the success message', () => {
    renderBookingForm();
    expect(screen.getByText('Booking Submitted!')).toBeInTheDocument();
  });

  it('shows redirect message', () => {
    renderBookingForm();
    expect(screen.getByText(/redirecting to your confirmation/i)).toBeInTheDocument();
  });

  it('does not show step indicator on done step', () => {
    renderBookingForm();
    expect(screen.queryByText('Dates')).not.toBeInTheDocument();
  });
});

describe('BookingForm — Auth Gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      user: null,
      loading: false,
      profile: null,
    });
    setStep('select', { check_in: '2026-04-15' });
  });

  afterEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', email: 'test@example.com' },
      loading: false,
      profile: null,
    });
  });

  it('shows auth modal when unauthenticated user clicks Continue', () => {
    renderBookingForm();
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
  });

  it('does not call nextStep when unauthenticated', () => {
    renderBookingForm();
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(mockNextStep).not.toHaveBeenCalled();
  });
});
