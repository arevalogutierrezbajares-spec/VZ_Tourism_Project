import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BookingForm } from '@/components/listing/BookingForm';
import { mockListing } from '@/__tests__/fixtures';

// Mock hooks
const mockNextStep = jest.fn();
const mockPrevStep = jest.fn();
const mockUpdateFormData = jest.fn();
const mockHandlePayment = jest.fn();
const mockGetTotalPrice = jest.fn(() => 170);

jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(() => ({
    isAuthenticated: true,
    user: { id: 'user-1', email: 'test@example.com' },
    loading: false,
  })),
}));

jest.mock('@/hooks/use-booking', () => ({
  useBooking: jest.fn(() => ({
    step: 'select',
    formData: { listing_id: 'listing-uuid-1', guests: 2 },
    isLoading: false,
    updateFormData: mockUpdateFormData,
    nextStep: mockNextStep,
    prevStep: mockPrevStep,
    handlePayment: mockHandlePayment,
    getTotalPrice: mockGetTotalPrice,
  })),
}));

// Mock AvailabilityCalendar to avoid complex setup
jest.mock('@/components/listing/AvailabilityCalendar', () => ({
  AvailabilityCalendar: ({ onDateSelect }: any) => (
    <div data-testid="availability-calendar">
      <button onClick={() => onDateSelect(new Date('2026-04-15'))}>
        Select April 15
      </button>
    </div>
  ),
}));

jest.mock('@/components/common/PriceDisplay', () => ({
  PriceDisplay: ({ priceUsd }: any) => <span data-testid="price-display">${priceUsd}</span>,
}));

import { useBooking } from '@/hooks/use-booking';

describe('BookingForm - Step 1 (select)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useBooking as jest.Mock).mockReturnValue({
      step: 'select',
      formData: { listing_id: 'listing-uuid-1', guests: 2 },
      isLoading: false,
      updateFormData: mockUpdateFormData,
      nextStep: mockNextStep,
      prevStep: mockPrevStep,
      handlePayment: mockHandlePayment,
      getTotalPrice: mockGetTotalPrice,
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
    expect(screen.getByText('Number of guests')).toBeInTheDocument();
  });

  it('shows step indicator', () => {
    render(<BookingForm listing={mockListing} />);
    expect(screen.getByText('Select Date')).toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();
    expect(screen.getByText('Payment')).toBeInTheDocument();
  });

  it('Continue button is disabled before date is selected', () => {
    render(<BookingForm listing={mockListing} />);
    const continueBtn = screen.getByText('Continue');
    expect(continueBtn).toBeDisabled();
  });

  it('enables Continue after date selection', () => {
    render(<BookingForm listing={mockListing} />);
    fireEvent.click(screen.getByText('Select April 15'));
    const continueBtn = screen.getByText('Continue');
    expect(continueBtn).not.toBeDisabled();
  });

  it('calls nextStep when Continue is clicked', () => {
    render(<BookingForm listing={mockListing} />);
    fireEvent.click(screen.getByText('Select April 15'));
    fireEvent.click(screen.getByText('Continue'));
    expect(mockNextStep).toHaveBeenCalled();
  });

  it('calls updateFormData with guests when + is clicked', () => {
    render(<BookingForm listing={mockListing} />);
    fireEvent.click(screen.getByText('+'));
    expect(mockUpdateFormData).toHaveBeenCalled();
  });

  it('calls updateFormData with guests when - is clicked', () => {
    render(<BookingForm listing={mockListing} />);
    fireEvent.click(screen.getByText('-'));
    expect(mockUpdateFormData).toHaveBeenCalled();
  });
});

describe('BookingForm - Step 2 (details)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useBooking as jest.Mock).mockReturnValue({
      step: 'details',
      formData: { listing_id: 'listing-uuid-1', guests: 2, check_in: '2026-04-15' },
      isLoading: false,
      updateFormData: mockUpdateFormData,
      nextStep: mockNextStep,
      prevStep: mockPrevStep,
      handlePayment: mockHandlePayment,
      getTotalPrice: mockGetTotalPrice,
    });
  });

  it('shows special requests textarea', () => {
    render(<BookingForm listing={mockListing} />);
    expect(screen.getByText('Special requests (optional)')).toBeInTheDocument();
  });

  it('shows total price', () => {
    render(<BookingForm listing={mockListing} />);
    const prices = screen.getAllByTestId('price-display');
    expect(prices.length).toBeGreaterThan(0);
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

  it('shows cancellation policy', () => {
    render(<BookingForm listing={mockListing} />);
    expect(screen.getByText(/cancellation policy/i)).toBeInTheDocument();
  });
});

describe('BookingForm - Step 3 (payment)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useBooking as jest.Mock).mockReturnValue({
      step: 'payment',
      formData: { listing_id: 'listing-uuid-1', guests: 2, check_in: '2026-04-15' },
      isLoading: false,
      updateFormData: mockUpdateFormData,
      nextStep: mockNextStep,
      prevStep: mockPrevStep,
      handlePayment: mockHandlePayment,
      getTotalPrice: mockGetTotalPrice,
    });
  });

  it('shows booking summary', () => {
    render(<BookingForm listing={mockListing} />);
    expect(screen.getByText('Booking Summary')).toBeInTheDocument();
  });

  it('shows Pay now button', () => {
    render(<BookingForm listing={mockListing} />);
    expect(screen.getByText('Pay now')).toBeInTheDocument();
  });

  it('calls handlePayment when Pay now is clicked', () => {
    render(<BookingForm listing={mockListing} />);
    fireEvent.click(screen.getByText('Pay now'));
    expect(mockHandlePayment).toHaveBeenCalled();
  });

  it('shows Stripe secure payment notice', () => {
    render(<BookingForm listing={mockListing} />);
    expect(screen.getByText(/Secure payment via Stripe/i)).toBeInTheDocument();
  });
});

describe('BookingForm - Confirmation', () => {
  beforeEach(() => {
    (useBooking as jest.Mock).mockReturnValue({
      step: 'confirmation',
      formData: {},
      isLoading: false,
      updateFormData: mockUpdateFormData,
      nextStep: mockNextStep,
      prevStep: mockPrevStep,
      handlePayment: mockHandlePayment,
      getTotalPrice: mockGetTotalPrice,
    });
  });

  it('shows confirmation message', () => {
    render(<BookingForm listing={mockListing} />);
    expect(screen.getByText('Booking Confirmed!')).toBeInTheDocument();
  });
});
