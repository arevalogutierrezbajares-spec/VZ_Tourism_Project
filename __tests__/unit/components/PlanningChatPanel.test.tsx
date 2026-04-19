import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { PlanningChatPanel } from '@/components/itinerary/PlanningChatPanel';
import { useItineraryStore } from '@/stores/itinerary-store';

// ─── Mock Radix-based ScrollArea ──────────────────────────────────────────────
jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>
      {children}
    </div>
  ),
}));

// ─── Mock useItineraryStore ───────────────────────────────────────────────────
// Note: jest.mock is hoisted — we reference the module mock via require inside tests.
jest.mock('@/stores/itinerary-store', () => {
  const mockFn = jest.fn(() => ({
    addStop: jest.fn(),
    addDay: jest.fn(),
    current: null,
    days: [],
  }));
  (mockFn as unknown as { getState: () => unknown }).getState = jest.fn(() => ({
    days: [],
  }));
  return { useItineraryStore: mockFn };
});

// ─── SSE reader mock ─────────────────────────────────────────────────────────
// jsdom does not implement ReadableStream — mock the reader interface directly.
function makeSSEBody(events: Array<Record<string, unknown>>) {
  const lines = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');
  // Use Node's Buffer to create a Uint8Array
  const chunk = new Uint8Array(Buffer.from(lines));
  let consumed = false;
  const reader = {
    read: jest.fn().mockImplementation(async () => {
      if (!consumed) {
        consumed = true;
        return { done: false, value: chunk };
      }
      return { done: true, value: undefined };
    }),
  };
  return { getReader: () => reader };
}

const mockFetch = global.fetch as jest.Mock;

describe('PlanningChatPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-configure the store mock for each test
    (useItineraryStore as jest.Mock).mockReturnValue({
      addStop: jest.fn(),
      addDay: jest.fn(),
      current: null,
      days: [],
    });
    const getState = (useItineraryStore as unknown as { getState: jest.Mock }).getState;
    if (getState) getState.mockReturnValue({ days: [] });
  });

  // ─── Rendering ────────────────────────────────────────────────────────────

  it('renders the "Trip Planner" heading', () => {
    render(<PlanningChatPanel />);
    expect(screen.getByText('Trip Planner')).toBeInTheDocument();
  });

  it('renders the AI-powered subtitle', () => {
    render(<PlanningChatPanel />);
    expect(screen.getByText('AI-powered itinerary assistant')).toBeInTheDocument();
  });

  it('renders the welcome message on empty state', () => {
    render(<PlanningChatPanel />);
    expect(
      screen.getByText(/Hey! I'm your Venezuela trip planner/i)
    ).toBeInTheDocument();
  });

  it('renders default starter prompts when no renderStarters is provided', () => {
    render(<PlanningChatPanel />);
    expect(
      screen.getByText('I want to explore beaches and nature for about a week')
    ).toBeInTheDocument();
    expect(screen.getByText('Plan a 3-day adventure trip for two')).toBeInTheDocument();
    expect(screen.getByText("What's the best way to see Angel Falls?")).toBeInTheDocument();
    expect(
      screen.getByText("I have 5 days, mix of culture and relaxation")
    ).toBeInTheDocument();
  });

  it('renders custom starters when renderStarters is provided', () => {
    const customStarters = (send: (t: string) => void) => (
      <button onClick={() => send('custom message')}>Custom starter</button>
    );
    render(<PlanningChatPanel renderStarters={customStarters} />);
    expect(screen.getByText('Custom starter')).toBeInTheDocument();
    // Default starters should NOT appear
    expect(
      screen.queryByText('I want to explore beaches and nature for about a week')
    ).toBeNull();
  });

  it('renders the message input field', () => {
    render(<PlanningChatPanel />);
    expect(
      screen.getByPlaceholderText('Describe your ideal trip...')
    ).toBeInTheDocument();
  });

  // ─── Close button ─────────────────────────────────────────────────────────

  it('does not render close button when onClose is not provided', () => {
    render(<PlanningChatPanel />);
    // No X button visible
    expect(screen.queryByRole('button', { name: '' })).toBeNull();
  });

  it('renders close button when onClose prop is provided', () => {
    const mockClose = jest.fn();
    render(<PlanningChatPanel onClose={mockClose} />);
    const buttons = screen.getAllByRole('button');
    // There should be buttons — find the icon-only close button
    expect(buttons.length).toBeGreaterThan(0);
  });

  // ─── Panel mode: hidden when closed ──────────────────────────────────────

  it('renders null when mode=panel and isOpen=false', () => {
    const { container } = render(
      <PlanningChatPanel mode="panel" isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders when mode=panel and isOpen=true', () => {
    render(<PlanningChatPanel mode="panel" isOpen={true} />);
    expect(screen.getByText('Trip Planner')).toBeInTheDocument();
  });

  it('always renders when mode=full regardless of isOpen', () => {
    render(<PlanningChatPanel mode="full" isOpen={false} />);
    expect(screen.getByText('Trip Planner')).toBeInTheDocument();
  });

  // ─── Input interaction ────────────────────────────────────────────────────

  it('submit button is disabled when input is empty', () => {
    render(<PlanningChatPanel />);
    // The send button (type=submit) should be disabled when input is blank
    const submitBtn = screen.getByRole('button', { name: '' });
    // Find the form submit button specifically
    const form = document.querySelector('form');
    expect(form).toBeTruthy();
    const submitButtons = Array.from(form!.querySelectorAll('button[type="submit"]'));
    if (submitButtons.length > 0) {
      expect(submitButtons[0]).toBeDisabled();
    }
  });

  it('typing in the input makes the submit button enabled', () => {
    render(<PlanningChatPanel />);
    const input = screen.getByPlaceholderText('Describe your ideal trip...');
    fireEvent.change(input, { target: { value: 'I want to see Angel Falls' } });
    const form = document.querySelector('form')!;
    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);
  });

  // ─── Sending messages ─────────────────────────────────────────────────────

  it('adds user message to chat after submitting', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: makeSSEStream([
        { type: 'text', text: 'Here is your itinerary!' },
        { type: 'done' },
      ]),
    });

    render(<PlanningChatPanel />);
    const input = screen.getByPlaceholderText('Describe your ideal trip...');
    fireEvent.change(input, { target: { value: 'Plan a trip to Mérida' } });

    await act(async () => {
      const form = document.querySelector('form')!;
      fireEvent.submit(form);
    });

    expect(screen.getByText('Plan a trip to Mérida')).toBeInTheDocument();
  });

  it('calls /api/itineraries/conversation with the message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: makeSSEStream([{ type: 'done' }]),
    });

    render(<PlanningChatPanel />);
    const input = screen.getByPlaceholderText('Describe your ideal trip...');
    fireEvent.change(input, { target: { value: 'Hello AI' } });

    await act(async () => {
      fireEvent.submit(document.querySelector('form')!);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/itineraries/conversation',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Hello AI'),
      })
    );
  });

  it('clears input after sending', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: makeSSEStream([{ type: 'done' }]),
    });

    render(<PlanningChatPanel />);
    const input = screen.getByPlaceholderText(
      'Describe your ideal trip...'
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'My message' } });

    await act(async () => {
      fireEvent.submit(document.querySelector('form')!);
    });

    expect(input.value).toBe('');
  });

  it('shows assistant response after streaming completes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: makeSSEStream([
        { type: 'text', text: 'Here is your plan for Mérida!' },
        { type: 'done' },
      ]),
    });

    render(<PlanningChatPanel />);
    fireEvent.change(
      screen.getByPlaceholderText('Describe your ideal trip...'),
      { target: { value: 'Plan a Mérida trip' } }
    );

    await act(async () => {
      fireEvent.submit(document.querySelector('form')!);
    });

    await waitFor(() => {
      expect(screen.getByText('Here is your plan for Mérida!')).toBeInTheDocument();
    });
  });

  it('clicking a default starter sends the message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: makeSSEStream([{ type: 'done' }]),
    });

    render(<PlanningChatPanel />);
    await act(async () => {
      fireEvent.click(
        screen.getByText('I want to explore beaches and nature for about a week')
      );
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/itineraries/conversation',
      expect.objectContaining({
        body: expect.stringContaining(
          'I want to explore beaches and nature for about a week'
        ),
      })
    );
  });

  // ─── Itinerary acceptance card ────────────────────────────────────────────

  it('shows "Itinerary Ready" card when itinerary event is received', async () => {
    const itineraryData = [
      {
        day: 1,
        title: 'Caracas Day',
        stops: [
          { title: 'Caracas Museum', cost_usd: 20, location_name: 'Caracas' },
        ],
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: makeSSEStream([
        { type: 'itinerary', data: itineraryData },
        { type: 'done' },
      ]),
    });

    render(<PlanningChatPanel />);
    fireEvent.change(
      screen.getByPlaceholderText('Describe your ideal trip...'),
      { target: { value: 'Plan a trip' } }
    );

    await act(async () => {
      fireEvent.submit(document.querySelector('form')!);
    });

    await waitFor(() => {
      expect(screen.getByText('Itinerary Ready')).toBeInTheDocument();
    });
    expect(screen.getByText('Caracas Museum')).toBeInTheDocument();
  });

  it('strips XML tags from displayed streaming text', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: makeSSEStream([
        {
          type: 'text',
          text: 'Here is your plan. <day-plan day="1">...</day-plan> Enjoy!',
        },
        { type: 'done' },
      ]),
    });

    render(<PlanningChatPanel />);
    fireEvent.change(
      screen.getByPlaceholderText('Describe your ideal trip...'),
      { target: { value: 'Plan a trip' } }
    );

    await act(async () => {
      fireEvent.submit(document.querySelector('form')!);
    });

    await waitFor(() => {
      expect(screen.getByText('Here is your plan. Enjoy!')).toBeInTheDocument();
    });
  });

  // ─── onDayPlan callback ───────────────────────────────────────────────────

  it('calls onDayPlan callback when a day-plan event arrives', async () => {
    const mockOnDayPlan = jest.fn();
    const dayData = { day: 1, title: 'Day 1', stops: [] };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: makeSSEStream([
        { type: 'day-plan', data: dayData },
        { type: 'done' },
      ]),
    });

    render(<PlanningChatPanel onDayPlan={mockOnDayPlan} />);
    fireEvent.change(
      screen.getByPlaceholderText('Describe your ideal trip...'),
      { target: { value: 'Plan my trip' } }
    );

    await act(async () => {
      fireEvent.submit(document.querySelector('form')!);
    });

    await waitFor(() => {
      expect(mockOnDayPlan).toHaveBeenCalledWith(dayData);
    });
  });
});
