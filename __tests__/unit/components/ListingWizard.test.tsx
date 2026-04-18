import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ListingWizard } from '@/components/provider/ListingWizard';

// Mock PricingSuggestion to avoid complex deps
jest.mock('@/components/provider/PricingSuggestion', () => ({
  PricingSuggestion: () => <div data-testid="pricing-suggestion">Pricing AI</div>,
}));

// Mock shadcn Select with native <select> so fireEvent.change works reliably in JSDOM
jest.mock('@/components/ui/select', () => ({
  Select: ({
    onValueChange,
    defaultValue,
    children,
  }: {
    onValueChange?: (v: string) => void;
    defaultValue?: string;
    children?: React.ReactNode;
  }) => (
    <select
      defaultValue={defaultValue}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <option value="">{placeholder ?? ''}</option>
  ),
  SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

// Current 7-step wizard: Basics → Photos → Details → Pricing → Availability → Policies → Publish
const STEPS = ['Basics', 'Photos', 'Details', 'Pricing', 'Availability', 'Policies', 'Publish'];

// Fill the required Basics fields so Continue is enabled on step 0
function fillBasicsStep() {
  fireEvent.change(screen.getByPlaceholderText(/Mérida Mountain Trek/i), {
    target: { value: 'Test experience' },
  });
  fireEvent.change(screen.getByPlaceholderText('Describe what guests will experience...'), {
    target: { value: 'A test description for the experience' },
  });
  // The Category select is the first native <select> in the DOM
  const selects = document.querySelectorAll('select');
  fireEvent.change(selects[0], { target: { value: 'beaches' } });
}

// Advance from step 0 to the given target step index
function advanceToStep(targetStep: number) {
  fillBasicsStep();
  fireEvent.click(screen.getByRole('button', { name: /continue/i })); // → step 1 (Photos)

  for (let i = 1; i < targetStep; i++) {
    if (i === 3) {
      // Pricing step: price_usd > 0 required
      fireEvent.change(screen.getByPlaceholderText('65'), { target: { value: '100' } });
    }
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  }
}

describe('ListingWizard', () => {
  it('renders without crashing', () => {
    render(<ListingWizard />);
  });

  it('renders all 7 step labels', () => {
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
    expect(screen.queryByRole('button', { name: /back/i })).toBeNull();
  });

  it('shows Continue button on first step', () => {
    render(<ListingWizard />);
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  it('Continue is disabled when required fields are empty', () => {
    render(<ListingWizard />);
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });

  it('advances to step 2 (Photos) when Basics form is valid', () => {
    render(<ListingWizard />);
    advanceToStep(1);
    expect(screen.getByText('Add photos')).toBeInTheDocument();
  });

  it('shows Back button after advancing to step 2', () => {
    render(<ListingWizard />);
    advanceToStep(1);
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  it('navigates back to step 1 (Basics) when Back is clicked', () => {
    render(<ListingWizard />);
    advanceToStep(1);
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByText('Tell us about your experience')).toBeInTheDocument();
  });

  it('advances to step 3 (Details)', () => {
    render(<ListingWizard />);
    advanceToStep(2);
    expect(screen.getByText('Experience details')).toBeInTheDocument();
  });

  it('advances to step 4 (Pricing)', () => {
    render(<ListingWizard />);
    advanceToStep(3);
    expect(screen.getByText('Set your price')).toBeInTheDocument();
  });

  it('advances to step 5 (Availability)', () => {
    render(<ListingWizard />);
    advanceToStep(4);
    expect(screen.getByText('Availability settings')).toBeInTheDocument();
  });

  it('advances to step 6 (Policies)', () => {
    render(<ListingWizard />);
    advanceToStep(5);
    expect(screen.getByRole('heading', { name: 'Policies' })).toBeInTheDocument();
  });

  it('reaches final step (Review & Publish)', () => {
    render(<ListingWizard />);
    advanceToStep(6);
    expect(screen.getByText('Review & Publish')).toBeInTheDocument();
  });

  it('shows Save as draft button on final step (default)', () => {
    render(<ListingWizard />);
    advanceToStep(6);
    // isPublished defaults to false → button reads "Save as draft"
    expect(screen.getByRole('button', { name: /save as draft/i })).toBeInTheDocument();
  });

  it('step indicator marks previous steps as completed', () => {
    render(<ListingWizard />);
    advanceToStep(1); // advance to step 2
    // Step labels are still all visible
    STEPS.forEach((step) => expect(screen.getByText(step)).toBeInTheDocument());
    // And we're showing Photos content
    expect(screen.getByText('Add photos')).toBeInTheDocument();
  });

  it('shows title field on Basics step', () => {
    render(<ListingWizard />);
    expect(screen.getByPlaceholderText(/Mérida Mountain Trek/i)).toBeInTheDocument();
  });

  it('shows category select on Basics step', () => {
    render(<ListingWizard />);
    expect(screen.getByText('Category *')).toBeInTheDocument();
  });

  it('shows region select on Basics step', () => {
    render(<ListingWizard />);
    expect(screen.getByText('Region *')).toBeInTheDocument();
  });

  it('shows location name field on Details step', () => {
    render(<ListingWizard />);
    advanceToStep(2);
    expect(screen.getByText('Location name *')).toBeInTheDocument();
  });

  it('shows price input on Pricing step', () => {
    render(<ListingWizard />);
    advanceToStep(3);
    expect(screen.getByText('Base price per person (USD) *')).toBeInTheDocument();
  });
});
