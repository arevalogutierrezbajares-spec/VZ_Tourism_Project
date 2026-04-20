/**
 * Integration Test: Itinerary Builder Flow
 *
 * Renders itinerary components and verifies the user flow:
 *   render panel -> add stops -> verify cost -> share -> dirty state -> save triggers API
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useItineraryStore } from '@/stores/itinerary-store';
import { mockItinerary, mockItineraryStop } from '@/__tests__/fixtures';
import type { ItineraryStop } from '@/types/database';

// ─── Mock heavy sub-components (portals, complex deps) ──────────────────────

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: React.forwardRef(
    (
      { children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string; asChild?: boolean },
      ref: React.Ref<HTMLButtonElement>
    ) => {
      const { variant, size, asChild, ...rest } = props as Record<string, unknown>;
      return (
        <button ref={ref} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
          {children}
        </button>
      );
    }
  ),
}));

// Mock sub-components used by ItineraryPanel
jest.mock('@/components/itinerary/ItineraryDaySection', () => ({
  ItineraryDaySection: ({
    day,
    stops,
    onAddStop,
    onRemoveStop,
    onRemoveDay,
  }: {
    day: number;
    title: string;
    stops: ItineraryStop[];
    onAddStop?: (day: number) => void;
    onRemoveStop?: (stopId: string) => void;
    onMoveStop?: (stopId: string, newDay: number, newOrder: number) => void;
    onRemoveDay?: (day: number) => void;
  }) => (
    <div data-testid={`day-section-${day}`}>
      <span>Day {day}</span>
      <span data-testid={`day-${day}-stop-count`}>
        {stops.length} stop{stops.length !== 1 ? 's' : ''}
      </span>
      {stops.map((s) => (
        <div key={s.id} data-testid={`stop-${s.id}`}>
          <span>{s.title}</span>
          <span data-testid={`stop-cost-${s.id}`}>${s.cost_usd}</span>
          {onRemoveStop && (
            <button onClick={() => onRemoveStop(s.id)} data-testid={`remove-stop-${s.id}`}>
              Remove
            </button>
          )}
        </div>
      ))}
      {onAddStop && (
        <button onClick={() => onAddStop(day)} data-testid={`add-stop-day-${day}`}>
          Add stop
        </button>
      )}
      {onRemoveDay && (
        <button onClick={() => onRemoveDay(day)} data-testid={`remove-day-${day}`}>
          Remove day
        </button>
      )}
    </div>
  ),
}));

jest.mock('@/components/itinerary/CostEstimator', () => ({
  CostEstimator: ({
    totalCost,
    breakdown,
  }: {
    totalCost: number;
    breakdown?: { label: string; amount: number }[];
  }) => (
    <div data-testid="cost-estimator">
      <span data-testid="total-cost">${totalCost}</span>
      {breakdown?.map((item, i) => (
        <div key={i} data-testid={`breakdown-${item.label}`}>
          {item.label}: ${item.amount}
        </div>
      ))}
    </div>
  ),
}));

jest.mock('@/components/itinerary/AddStopModal', () => ({
  AddStopModal: ({
    isOpen,
    day,
    onClose,
  }: {
    isOpen: boolean;
    day: number;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="add-stop-modal">
        <span>Add stop for Day {day}</span>
        <button onClick={onClose} data-testid="close-add-stop-modal">
          Close
        </button>
      </div>
    ) : null,
}));

jest.mock('@/components/itinerary/FillItineraryModal', () => ({
  FillItineraryModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="fill-modal">Fill Modal</div> : null,
}));

jest.mock('@/components/itinerary/ImportLinksModal', () => ({
  ImportLinksModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="import-modal">Import Modal</div> : null,
}));

jest.mock('@/components/itinerary/ExtractFromTextModal', () => ({
  ExtractFromTextModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="extract-modal">Extract Modal</div> : null,
}));

jest.mock('@/components/itinerary/PlanningChatPanel', () => ({
  PlanningChatPanel: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="chat-panel">Planning Chat</div> : null,
}));

// ─── Mock the useItinerary hook to proxy through the real store ─────────────

const mockCreateNew = jest.fn();
const mockLoadItinerary = jest.fn();
const mockShareItinerary = jest.fn();
const mockSaveWithFeedback = jest.fn();
const mockOptimizeItinerary = jest.fn();
const mockAddListingToItinerary = jest.fn();

jest.mock('@/hooks/use-itinerary', () => ({
  useItinerary: () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const store = require('@/stores/itinerary-store').useItineraryStore();
    return {
      ...store,
      isCreating: false,
      isOptimizing: false,
      createNew: mockCreateNew,
      loadItinerary: mockLoadItinerary,
      shareItinerary: mockShareItinerary,
      save: mockSaveWithFeedback,
      optimizeItinerary: mockOptimizeItinerary,
      addListingToItinerary: mockAddListingToItinerary,
    };
  },
}));

// ─── Import components after mocks ──────────────────────────────────────────

import { ItineraryPanel } from '@/components/itinerary/ItineraryPanel';
import { CostEstimator } from '@/components/itinerary/CostEstimator';
import { ShareButton } from '@/components/itinerary/ShareButton';
import { MyTripFab } from '@/components/itinerary/MyTripFab';
import { SmartStarters } from '@/components/itinerary/SmartStarters';

// ─── Helpers ────────────────────────────────────────────────────────────────

const initialState = {
  current: null,
  days: [],
  totalCost: 0,
  isDirty: false,
  isSaving: false,
  isOpen: false,
};

function makeStopPayload(
  overrides: Partial<Omit<ItineraryStop, 'id' | 'created_at'>> = {}
): Omit<ItineraryStop, 'id' | 'created_at'> {
  return {
    itinerary_id: 'itinerary-uuid-1',
    listing_id: null,
    day: 1,
    order: 0,
    title: 'Test Stop',
    description: null,
    latitude: null,
    longitude: null,
    location_name: null,
    start_time: null,
    end_time: null,
    duration_hours: null,
    cost_usd: 0,
    transport_to_next: null,
    transport_duration_minutes: null,
    notes: null,
    ...overrides,
  };
}

function setupPanelWithItinerary() {
  const store = useItineraryStore.getState();
  store.setItinerary(mockItinerary);
  useItineraryStore.setState({ isOpen: true });
}

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  useItineraryStore.setState(initialState);
  (global.fetch as jest.Mock).mockReset();
  jest.clearAllMocks();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ItineraryPanel rendering', () => {
  it('renders null when panel is closed', () => {
    const { container } = render(<ItineraryPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('renders null when no itinerary is loaded', () => {
    useItineraryStore.setState({ isOpen: true });
    const { container } = render(<ItineraryPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the itinerary title when open with an itinerary', () => {
    setupPanelWithItinerary();
    render(<ItineraryPanel />);
    expect(screen.getByText('Venezuela Adventure Week')).toBeInTheDocument();
  });

  it('renders day sections for each day in the store', () => {
    setupPanelWithItinerary();
    render(<ItineraryPanel />);
    // mockItinerary has 7 total_days but only 1 stop on day 1 -> setItinerary creates 1 day
    expect(screen.getByTestId('day-section-1')).toBeInTheDocument();
  });

  it('shows the cost estimator', () => {
    setupPanelWithItinerary();
    render(<ItineraryPanel />);
    expect(screen.getByTestId('cost-estimator')).toBeInTheDocument();
    // mockItinerary has one stop with cost_usd: 85
    expect(screen.getByTestId('total-cost')).toHaveTextContent('$85');
  });
});

describe('ItineraryPanel interactions', () => {
  it('calls closePanel when close button is clicked', () => {
    setupPanelWithItinerary();
    render(<ItineraryPanel />);
    const closeBtn = screen.getByRole('button', { name: /close itinerary panel/i });
    fireEvent.click(closeBtn);
    // Store should reflect closed state
    expect(useItineraryStore.getState().isOpen).toBe(false);
  });

  it('calls addDay when "Add day" button is clicked', () => {
    setupPanelWithItinerary();
    render(<ItineraryPanel />);
    const addDayBtn = screen.getByRole('button', { name: /add day/i });
    fireEvent.click(addDayBtn);
    expect(useItineraryStore.getState().days.length).toBeGreaterThan(1);
  });

  it('opens AddStopModal when "Add stop" is clicked in a day section', () => {
    setupPanelWithItinerary();
    render(<ItineraryPanel />);
    fireEvent.click(screen.getByTestId('add-stop-day-1'));
    expect(screen.getByTestId('add-stop-modal')).toBeInTheDocument();
    expect(screen.getByText('Add stop for Day 1')).toBeInTheDocument();
  });

  it('closes AddStopModal when close is clicked', () => {
    setupPanelWithItinerary();
    render(<ItineraryPanel />);
    fireEvent.click(screen.getByTestId('add-stop-day-1'));
    expect(screen.getByTestId('add-stop-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('close-add-stop-modal'));
    expect(screen.queryByTestId('add-stop-modal')).not.toBeInTheDocument();
  });

  it('calls removeStop when remove button is clicked in a stop', () => {
    setupPanelWithItinerary();
    render(<ItineraryPanel />);
    const removeBtn = screen.getByTestId('remove-stop-stop-uuid-1');
    fireEvent.click(removeBtn);
    // stop should be removed from store
    const stops = useItineraryStore.getState().days[0]?.stops ?? [];
    expect(stops.find((s) => s.id === 'stop-uuid-1')).toBeUndefined();
  });

  it('calls shareItinerary when share button is clicked', () => {
    setupPanelWithItinerary();
    render(<ItineraryPanel />);
    const shareBtn = screen.getByRole('button', { name: /share itinerary/i });
    fireEvent.click(shareBtn);
    expect(mockShareItinerary).toHaveBeenCalledTimes(1);
  });
});

describe('ItineraryPanel dirty state and save', () => {
  it('does not show save button when isDirty is false', () => {
    setupPanelWithItinerary();
    render(<ItineraryPanel />);
    // isDirty is false after setItinerary
    expect(screen.queryByRole('button', { name: /save itinerary/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Save changes')).not.toBeInTheDocument();
  });

  it('shows save button when isDirty is true', () => {
    setupPanelWithItinerary();
    useItineraryStore.setState({ isDirty: true });
    render(<ItineraryPanel />);
    expect(screen.getByRole('button', { name: /save itinerary/i })).toBeInTheDocument();
    expect(screen.getByText('Save changes')).toBeInTheDocument();
  });

  it('shows "unsaved" indicator when isDirty', () => {
    setupPanelWithItinerary();
    useItineraryStore.setState({ isDirty: true });
    render(<ItineraryPanel />);
    expect(screen.getByText(/unsaved/)).toBeInTheDocument();
  });

  it('calls save when save button in header is clicked', () => {
    setupPanelWithItinerary();
    useItineraryStore.setState({ isDirty: true });
    render(<ItineraryPanel />);
    const saveBtn = screen.getByRole('button', { name: /save itinerary/i });
    fireEvent.click(saveBtn);
    expect(mockSaveWithFeedback).toHaveBeenCalledTimes(1);
  });

  it('calls save when "Save changes" footer button is clicked', () => {
    setupPanelWithItinerary();
    useItineraryStore.setState({ isDirty: true });
    render(<ItineraryPanel />);
    fireEvent.click(screen.getByText('Save changes'));
    expect(mockSaveWithFeedback).toHaveBeenCalled();
  });

  it('shows "Saving..." text when isSaving is true', () => {
    setupPanelWithItinerary();
    useItineraryStore.setState({ isDirty: true, isSaving: true });
    render(<ItineraryPanel />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });
});

describe('ItineraryPanel cost updates after stop changes', () => {
  it('cost reflects added stops via store', () => {
    setupPanelWithItinerary();

    // Add a stop via the store directly (simulating what AddStopModal would do)
    act(() => {
      useItineraryStore.getState().addStop(
        makeStopPayload({ day: 1, order: 1, title: 'Extra Tour', cost_usd: 60 })
      );
    });

    // Re-render to pick up new state
    const { rerender } = render(<ItineraryPanel />);
    rerender(<ItineraryPanel />);

    // totalCost in the store should be 85 + 60 = 145
    expect(useItineraryStore.getState().totalCost).toBe(145);
  });

  it('cost drops to 0 after removing all stops', () => {
    setupPanelWithItinerary();

    act(() => {
      useItineraryStore.getState().removeStop('stop-uuid-1');
    });

    expect(useItineraryStore.getState().totalCost).toBe(0);
  });
});

// ─── CostEstimator standalone ───────────────────────────────────────────────

describe('CostEstimator (standalone)', () => {
  it('renders total cost', () => {
    render(<CostEstimator totalCost={150} />);
    expect(screen.getByTestId('total-cost')).toHaveTextContent('$150');
  });

  it('renders breakdown items when provided', () => {
    const breakdown = [
      { label: 'Day 1', amount: 85 },
      { label: 'Day 2', amount: 65 },
    ];
    render(<CostEstimator totalCost={150} breakdown={breakdown} />);
    expect(screen.getByTestId('breakdown-Day 1')).toHaveTextContent('Day 1: $85');
    expect(screen.getByTestId('breakdown-Day 2')).toHaveTextContent('Day 2: $65');
  });

  it('renders zero cost correctly', () => {
    render(<CostEstimator totalCost={0} />);
    expect(screen.getByTestId('total-cost')).toHaveTextContent('$0');
  });
});

// ─── ShareButton standalone ─────────────────────────────────────────────────

describe('ShareButton (standalone)', () => {
  beforeEach(() => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
      share: undefined,
    });
  });

  it('renders share button with title', () => {
    render(<ShareButton title="My Trip" />);
    expect(
      screen.getByRole('button', { name: /share my trip/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
  });

  it('copies link to clipboard on click (no navigator.share)', async () => {
    render(<ShareButton title="My Trip" url="https://example.com/trip/123" />);
    fireEvent.click(screen.getByRole('button', { name: /share my trip/i }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'https://example.com/trip/123'
      );
    });
  });

  it('shows "Link copied!" after successful copy', async () => {
    render(<ShareButton title="My Trip" url="https://example.com/trip/123" />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Link copied!')).toBeInTheDocument();
    });
  });
});

// ─── MyTripFab standalone ───────────────────────────────────────────────────

describe('MyTripFab', () => {
  it('renders nothing when no itinerary is loaded', () => {
    const { container } = render(<MyTripFab />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the fab when an itinerary exists', () => {
    useItineraryStore.getState().setItinerary(mockItinerary);
    render(<MyTripFab />);
    expect(screen.getByText('My Trip')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view my trip/i })).toHaveAttribute(
      'href',
      '/plan'
    );
  });

  it('shows stop count badge when stops exist', () => {
    useItineraryStore.getState().setItinerary(mockItinerary);
    render(<MyTripFab />);
    // mockItinerary has 1 stop
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('does not show badge when there are no stops', () => {
    useItineraryStore.getState().setItinerary({
      ...mockItinerary,
      stops: [],
    });
    render(<MyTripFab />);
    expect(screen.getByText('My Trip')).toBeInTheDocument();
    // No count badge
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});

// ─── SmartStarters standalone ───────────────────────────────────────────────

describe('SmartStarters', () => {
  it('renders all vibe options', () => {
    const onSend = jest.fn();
    render(<SmartStarters onSend={onSend} />);
    expect(screen.getByText('Beach & Chill')).toBeInTheDocument();
    expect(screen.getByText('Mountain Adventure')).toBeInTheDocument();
    expect(screen.getByText('Angel Falls')).toBeInTheDocument();
    expect(screen.getByText('Food & Culture')).toBeInTheDocument();
    expect(screen.getByText('City & Nightlife')).toBeInTheDocument();
    expect(screen.getByText('Nature & Wildlife')).toBeInTheDocument();
  });

  it('renders all duration options', () => {
    const onSend = jest.fn();
    render(<SmartStarters onSend={onSend} />);
    expect(screen.getByText('3 days')).toBeInTheDocument();
    expect(screen.getByText('5 days')).toBeInTheDocument();
    expect(screen.getByText('1 week')).toBeInTheDocument();
    expect(screen.getByText('10 days')).toBeInTheDocument();
  });

  it('does not call onSend when only vibe is selected', () => {
    const onSend = jest.fn();
    render(<SmartStarters onSend={onSend} />);
    fireEvent.click(screen.getByText('Beach & Chill'));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('does not call onSend when only duration is selected', () => {
    const onSend = jest.fn();
    render(<SmartStarters onSend={onSend} />);
    fireEvent.click(screen.getByText('5 days'));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('calls onSend when both vibe and duration are selected (vibe first)', () => {
    const onSend = jest.fn();
    render(<SmartStarters onSend={onSend} />);
    fireEvent.click(screen.getByText('Beach & Chill'));
    fireEvent.click(screen.getByText('5 days'));
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith(
      'I want a 5-day trip focused on beach and relaxation in Venezuela.'
    );
  });

  it('calls onSend when both vibe and duration are selected (duration first)', () => {
    const onSend = jest.fn();
    render(<SmartStarters onSend={onSend} />);
    fireEvent.click(screen.getByText('1 week')); // "1 week" maps to 7 days
    fireEvent.click(screen.getByText('Angel Falls'));
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith(
      'I want a 7-day trip focused on visiting Angel Falls and Canaima in Venezuela.'
    );
  });
});

// ─── ItineraryPanel empty state ─────────────────────────────────────────────

describe('ItineraryPanel empty state (no stops)', () => {
  it('shows creation options when itinerary has no stops', () => {
    useItineraryStore.setState({
      isOpen: true,
      current: { ...mockItinerary, stops: [] },
      days: [{ day: 1, title: 'Day 1', stops: [] }],
      totalCost: 0,
      isDirty: false,
    });
    render(<ItineraryPanel />);
    expect(screen.getByText('How do you want to start?')).toBeInTheDocument();
    expect(screen.getByText('Chat with AI Planner')).toBeInTheDocument();
    expect(screen.getByText('Quick Generate')).toBeInTheDocument();
  });
});
