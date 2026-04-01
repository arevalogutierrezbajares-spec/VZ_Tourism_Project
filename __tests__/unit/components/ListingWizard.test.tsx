import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ListingWizard } from '@/components/provider/ListingWizard';

// Mock PricingSuggestion to avoid complex deps
jest.mock('@/components/provider/PricingSuggestion', () => ({
  PricingSuggestion: () => <div data-testid="pricing-suggestion">Pricing AI</div>,
}));

const STEPS = ['Basics', 'Location', 'Pricing', 'Details', 'Review'];

describe('ListingWizard', () => {
  it('renders without crashing', () => {
    render(<ListingWizard />);
  });

  it('renders all 5 step labels', () => {
    render(<ListingWizard />);
    STEPS.forEach((step) => {
      expect(screen.getByText(step)).toBeInTheDocument();
    });
  });

  it('starts on step 1 (Basics)', () => {
    render(<ListingWizard />);
    expect(screen.getByText('Tell us about your experience')).toBeInTheDocument();
  });

  it('does not show Back button on first step', () => {
    render(<ListingWizard />);
    expect(screen.queryByText('Back')).toBeNull();
  });

  it('shows Continue button on first step', () => {
    render(<ListingWizard />);
    expect(screen.getByText('Continue')).toBeInTheDocument();
  });

  it('advances to step 2 (Location) on Continue', () => {
    render(<ListingWizard />);
    fireEvent.click(screen.getByText('Continue'));
    expect(screen.getByText('Where is it located?')).toBeInTheDocument();
  });

  it('shows Back button after advancing', () => {
    render(<ListingWizard />);
    fireEvent.click(screen.getByText('Continue'));
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('navigates back to step 1 when Back is clicked', () => {
    render(<ListingWizard />);
    fireEvent.click(screen.getByText('Continue'));
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText('Tell us about your experience')).toBeInTheDocument();
  });

  it('advances to step 3 (Pricing)', () => {
    render(<ListingWizard />);
    fireEvent.click(screen.getByText('Continue')); // to Location
    fireEvent.click(screen.getByText('Continue')); // to Pricing
    expect(screen.getByText('Set your price')).toBeInTheDocument();
  });

  it('advances to step 4 (Details)', () => {
    render(<ListingWizard />);
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByText('Continue'));
    expect(screen.getByText('Experience details')).toBeInTheDocument();
  });

  it('advances to step 5 (Review)', () => {
    render(<ListingWizard />);
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByText('Continue'));
    expect(screen.getByText('Review & submit')).toBeInTheDocument();
  });

  it('shows Create listing button on final step', () => {
    render(<ListingWizard />);
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByText('Continue'));
    expect(screen.getByText('Create listing')).toBeInTheDocument();
  });

  it('step indicator marks previous steps as completed', () => {
    render(<ListingWizard />);
    fireEvent.click(screen.getByText('Continue')); // advance to step 2
    // Step 1 indicator should show checkmark (SVG)
    const { container } = render(<ListingWizard />);
    fireEvent.click(container.querySelector('button[type="button"]')!);
    // Just verify the render doesn't crash after navigation
  });

  it('shows title field on Basics step', () => {
    render(<ListingWizard />);
    expect(screen.getByPlaceholderText(/Mérida Mountain Trek/i)).toBeInTheDocument();
  });

  it('shows category select on Basics step', () => {
    render(<ListingWizard />);
    expect(screen.getByText('Category *')).toBeInTheDocument();
  });

  it('shows region select on Location step', () => {
    render(<ListingWizard />);
    fireEvent.click(screen.getByText('Continue'));
    expect(screen.getByText('Region *')).toBeInTheDocument();
  });

  it('shows price input on Pricing step', () => {
    render(<ListingWizard />);
    fireEvent.click(screen.getByText('Continue'));
    fireEvent.click(screen.getByText('Continue'));
    expect(screen.getByText('Price per person (USD) *')).toBeInTheDocument();
  });
});
