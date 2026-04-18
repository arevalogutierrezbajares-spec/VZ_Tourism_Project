import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BookingForm } from '@/components/listing/BookingForm';
import { mockListing } from '@/__tests__/fixtures';

// Mock hooks
const mockNextStep = jest.fn();
const mockPrevStep = jest.fn();
const mockUpdateFormData = jest.fn();
const mockSubmitBooking = jest.fn();
const mockHandleCardPayment = jest.fn();
const mockHandleManualPaymentConfirm = jest.fn();
const mockHandleArrivalBooking = jest.fn();
const mockGetNights = jest.fn(() => 2);
const mockGetSubtotal = jest.fn(() => 170);
const mockGetServiceFee = jest.fn(() => 17);
const mockGetTotal = jest.fn(() => 187);

jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(() => ({
    isAuthenticated: true,
    user: { id: 'user-1', email: 'test@example.com' },
    loading: false,
    profile: null,
  })),
}));

const baseFormData = {
  listing_id: 'listing-uuid-1',
  guest_count: 2,
  guest_name: 'Test User',
  guest_email: 'test@example.com',
  guest_phone: '',
  special_requests: '',
  payment_method: 'card',
};

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

// Mock AvailabilityCalendar to avoid complex setup
jest.mock('@/components/listing/AvailabilityCalendar', () => ({
  AvailabilityCalendar: ({ onRangeSelect }: any) => (
    <div data-testid="availability-calendar">
      <button onClick={() => onRangeSelect('2026-04-15', '2026-04-17')}>
        Select April 15–17
      </button>
    </div>
  ),
}));

jest.mock('@/components/common/PriceDisplay', () => ({
  PriceDisplay: ({ priceUsd }: any) => <span data-testid="price-display">${priceUsd}</span>,
}));

jest.mock('@/components/common/AuthModal', () => ({
  AuthModal: () => null,
}));

import { useBooking } from '@/hooks/use-booking';

describe('BookingForm - Step 1 (select)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useBooking as jest.Mock).mockReturnValue({
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
    });
  });

  it('renders the booking form', () => {
    render(<BookingForm listing={mockListing} />);
    expect(screen.getByTestId('availability-calendar')).toBeInTheDocument();
  });

  it('shows the listing price', () => {
    render(<BookingForm listing={mockListing} />);
    expect(screen.getByTestId('price-display')).toBeInTheDocument();
  });

  it('shows guest count controls', () => {
    render(<BookingForm listing={mockListing} />);
    expect(screen.getByText('Guests')).toBeInTheDocument();
  });

  it('shows step indicator', () => {
    render(<BookingForm listing={mockListing} />);
    expect(screen.getByText('Dates')).toBeInTheDocument();
    expect(screen.getByText('Your Info')).toBeInTheDocument();
    expect(screen.getByText('Payment')).toBeInTheDocument();
  });

  it('Continue button is disabled before date is selected', () => {
    render(<BookingForm listing={mockListing} />);
    const continueBtn = screen.getByText(/Continue/);
    expect(continueBtn).toBeDisabled();
  });

  it('enables Continue after date selection', () => {
    (useBooking as jest.Mock).mockReturnValue({
      step: 'select',
      formData: { ...baseFormData, check_in: '2026-04-15', check_out: '2026-04-17' },
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
    });
    render(<BookingForm listing={mockListing} />);
    const continueBtn = screen.getByText(/Continue/);
    expect(continueBtn).not.toBeDisabled();
  });

  it('calls updateFormData with guests when + is clicked', () => {
    render(<BookingForm listing={mockListing} />);
    fireEvent.click(screen.getByText('+'));
    expect(mockUpdateFormData).toHaveBeenCalled();
  });
});

describe('BookingForm - Step 2 (details)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useBooking as jest.Mock).mockReturnValue({
      step: 'details',
      formData: { ...baseFormData, check_in: '2026-04-15', check_out: '2026-04-17' },
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
    });
  });

  it('shows special requests textarea', () => {
    render(<BookingForm listing={mockListing} />);
    expect(screen.getByText('Special requests')).toBeInTheDocument();
  });

  it('shows Back button', () => {
    render(<BookingForm listing={mockListing} />);
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('calls prevStep when Back is clicked', () => {
    render(<BookingForm listing={mockListing} />);
    fireEvent.click(screen.getByText('Back'));
    expect(mockPrevStep).toHaveBeenCalled();
  });
});

describe('BookingForm - Step 3 (review)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useBooking as jest.Mock).mockReturnValue({
      step: 'review',
      formData: { ...baseFormData, check_in: '2026-04-15', check_out: '2026-04-17' },
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
    });
  });

  it('shows review step content', () => {
    render(<BookingForm listing={mockListing} />);
    // Review step shows Back button and booking action button
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('shows cancellation policy', () => {
    render(<BookingForm listing={mockListing} />);
    expect(screen.getByText(/cancellation policy/i)).toBeInTheDocument();
  });

  it('shows request to book button for unverified provider', () => {
    render(<BookingForm listing={mockListing} />);
    expect(screen.getByText('Request to Book')).toBeInTheDocument();
  });

  it('shows Back button', () => {
    render(<BookingForm listing={mockListing} />);
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('shows instant book button for verified provider', () => {
    const verifiedListing = {
      ...mockListing,
      provider: { is_verified: true, whatsapp_number: null },
    };
    render(<BookingForm listing={verifiedListing as any} />);
    expect(screen.getByText('Book Now')).toBeInTheDocument();
  });
});

describe('BookingForm - Confirmation', () => {
  beforeEach(() => {
    (useBooking as jest.Mock).mockReturnValue({
      step: 'done',
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
    });
  });

  it('shows submission message', () => {
    render(<BookingForm listing={mockListing} />);
    expect(screen.getByText('Booking Submitted!')).toBeInTheDocument();
  });
});
