import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BuildItineraryModal } from '@/components/itinerary/BuildItineraryModal';
import { useRouter } from 'next/navigation';

// ─── Mock shadcn Dialog (Radix UI portal won't work in jsdom) ────────────────
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({
    children,
  }: {
    children: React.ReactNode;
    showCloseButton?: boolean;
    className?: string;
  }) => <div data-testid="dialog-content">{children}</div>,
  DialogTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 data-testid="dialog-title" className={className}>
      {children}
    </h2>
  ),
}));

describe('BuildItineraryModal', () => {
  const mockPush = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  // ─── Visibility ───────────────────────────────────────────────────────────

  it('renders nothing when open is false', () => {
    const { container } = render(
      <BuildItineraryModal open={false} onClose={mockOnClose} />
    );
    expect(container.querySelector('[data-testid="dialog-content"]')).toBeNull();
  });

  it('renders the dialog when open is true', () => {
    render(<BuildItineraryModal open={true} onClose={mockOnClose} />);
    expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
  });

  // ─── Step 1: Choose ───────────────────────────────────────────────────────

  it('shows all 3 options in the choose step', () => {
    render(<BuildItineraryModal open={true} onClose={mockOnClose} />);
    expect(screen.getByText('Describe my dream trip')).toBeInTheDocument();
    expect(screen.getByText('Browse the map')).toBeInTheDocument();
    expect(screen.getByText('Import an existing plan')).toBeInTheDocument();
  });

  it('shows "Most popular" badge on the AI option', () => {
    render(<BuildItineraryModal open={true} onClose={mockOnClose} />);
    expect(screen.getByText('Most popular')).toBeInTheDocument();
  });

  it('shows "How would you like to start?" subtitle', () => {
    render(<BuildItineraryModal open={true} onClose={mockOnClose} />);
    expect(screen.getByText('How would you like to start?')).toBeInTheDocument();
  });

  it('Continue button is disabled when no option is selected', () => {
    render(<BuildItineraryModal open={true} onClose={mockOnClose} />);
    const continueBtn = screen.getByRole('button', { name: /continue/i });
    expect(continueBtn).toBeDisabled();
  });

  it('Continue button is enabled after selecting an option', () => {
    render(<BuildItineraryModal open={true} onClose={mockOnClose} />);
    fireEvent.click(screen.getByText('Describe my dream trip'));
    const continueBtn = screen.getByRole('button', { name: /continue/i });
    expect(continueBtn).not.toBeDisabled();
  });

  // ─── AI option → /plan ────────────────────────────────────────────────────

  it('navigates to /plan when AI option is selected and Continue is clicked', () => {
    jest.useFakeTimers();
    render(<BuildItineraryModal open={true} onClose={mockOnClose} />);
    fireEvent.click(screen.getByText('Describe my dream trip'));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    jest.runAllTimers();
    expect(mockPush).toHaveBeenCalledWith('/plan');
    jest.useRealTimers();
  });

  // ─── Map option → /map ────────────────────────────────────────────────────

  it('navigates to /map when Map option is selected and Continue is clicked', () => {
    jest.useFakeTimers();
    render(<BuildItineraryModal open={true} onClose={mockOnClose} />);
    fireEvent.click(screen.getByText('Browse the map'));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    jest.runAllTimers();
    expect(mockPush).toHaveBeenCalledWith('/map');
    jest.useRealTimers();
  });

  // ─── Paste option → step 2 ────────────────────────────────────────────────

  it('shows paste step when Import is selected and Continue is clicked', () => {
    render(<BuildItineraryModal open={true} onClose={mockOnClose} />);
    fireEvent.click(screen.getByText('Import an existing plan'));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    // Should now be in the paste step
    expect(screen.getByText('Import your plan')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('paste step: back button returns to choose step', () => {
    render(<BuildItineraryModal open={true} onClose={mockOnClose} />);
    fireEvent.click(screen.getByText('Import an existing plan'));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    // Now in paste step, click back
    fireEvent.click(screen.getByRole('button', { name: /go back/i }));
    // Should be back to choose step
    expect(screen.getByText('Describe my dream trip')).toBeInTheDocument();
  });

  it('paste step: Build button is disabled when textarea is empty', () => {
    render(<BuildItineraryModal open={true} onClose={mockOnClose} />);
    fireEvent.click(screen.getByText('Import an existing plan'));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    const buildBtn = screen.getByRole('button', { name: /build my itinerary/i });
    expect(buildBtn).toBeDisabled();
  });

  it('paste step: Build button enabled after typing text', () => {
    render(<BuildItineraryModal open={true} onClose={mockOnClose} />);
    fireEvent.click(screen.getByText('Import an existing plan'));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Day 1: Caracas, Day 2: Mérida' },
    });
    const buildBtn = screen.getByRole('button', { name: /build my itinerary/i });
    expect(buildBtn).not.toBeDisabled();
  });

  it('paste step: navigates to /plan with encoded plan on Build click', () => {
    jest.useFakeTimers();
    render(<BuildItineraryModal open={true} onClose={mockOnClose} />);
    fireEvent.click(screen.getByText('Import an existing plan'));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    const planText = 'Day 1: Caracas';
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: planText },
    });
    fireEvent.click(screen.getByRole('button', { name: /build my itinerary/i }));
    jest.runAllTimers();
    expect(mockPush).toHaveBeenCalledWith(
      `/plan?plan=${encodeURIComponent(planText)}`
    );
    jest.useRealTimers();
  });

  it('paste step: shows character count when text is entered', () => {
    render(<BuildItineraryModal open={true} onClose={mockOnClose} />);
    fireEvent.click(screen.getByText('Import an existing plan'));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Hello' },
    });
    expect(screen.getByText(/5 characters/)).toBeInTheDocument();
  });
});
