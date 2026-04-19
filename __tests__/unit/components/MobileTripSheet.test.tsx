import React from 'react';
import { render, screen } from '@testing-library/react';
import { MobileTripSheet } from '@/components/itinerary/MobileTripSheet';

// ─── Mock vaul Drawer (portal-based, doesn't work in jsdom) ─────────────────
jest.mock('vaul', () => ({
  Drawer: {
    Root: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="drawer-root">{children}</div>
    ),
    Trigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
      <div data-testid="drawer-trigger">{children}</div>
    ),
    Portal: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="drawer-portal">{children}</div>
    ),
    Overlay: () => <div data-testid="drawer-overlay" />,
    Content: ({ children }: { children: React.ReactNode; className?: string }) => (
      <div data-testid="drawer-content">{children}</div>
    ),
  },
}));

// ─── Mock useItineraryStore ───────────────────────────────────────────────────
const mockStoreState = {
  days: [] as Array<{ day: number; title: string; stops: unknown[] }>,
  totalCost: 0,
};

jest.mock('@/stores/itinerary-store', () => ({
  useItineraryStore: jest.fn(() => mockStoreState),
}));

import { useItineraryStore } from '@/stores/itinerary-store';

describe('MobileTripSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useItineraryStore as jest.Mock).mockReturnValue({ days: [], totalCost: 0 });
  });

  // ─── Conditional rendering ────────────────────────────────────────────────

  it('renders null when there are no stops', () => {
    (useItineraryStore as jest.Mock).mockReturnValue({ days: [], totalCost: 0 });
    const { container } = render(
      <MobileTripSheet>
        <p>Trip preview</p>
      </MobileTripSheet>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders null when days exist but have no stops', () => {
    (useItineraryStore as jest.Mock).mockReturnValue({
      days: [{ day: 1, title: 'Day 1', stops: [] }],
      totalCost: 0,
    });
    const { container } = render(
      <MobileTripSheet>
        <p>Trip preview</p>
      </MobileTripSheet>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the pill trigger when stops exist', () => {
    (useItineraryStore as jest.Mock).mockReturnValue({
      days: [{ day: 1, title: 'Day 1', stops: [{ id: 's1' }, { id: 's2' }] }],
      totalCost: 50,
    });
    render(
      <MobileTripSheet>
        <p>Trip preview</p>
      </MobileTripSheet>
    );
    expect(screen.getByTestId('drawer-root')).toBeInTheDocument();
  });

  // ─── Summary text ─────────────────────────────────────────────────────────

  it('shows correct stop count in pill (singular)', () => {
    (useItineraryStore as jest.Mock).mockReturnValue({
      days: [{ day: 1, title: 'Day 1', stops: [{ id: 's1' }] }],
      totalCost: 0,
    });
    render(
      <MobileTripSheet>
        <p>Trip preview</p>
      </MobileTripSheet>
    );
    // Multiple elements show the count — verify at least one exists
    const matches = screen.getAllByText(/1 stop/);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('shows plural stops when count > 1', () => {
    (useItineraryStore as jest.Mock).mockReturnValue({
      days: [{ day: 1, title: 'Day 1', stops: [{ id: 's1' }, { id: 's2' }, { id: 's3' }] }],
      totalCost: 0,
    });
    render(
      <MobileTripSheet>
        <p>Trip preview</p>
      </MobileTripSheet>
    );
    // Both the trigger pill and drawer header show the count
    const matches = screen.getAllByText(/3 stops/);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('shows "1 day" (singular) when there is 1 day', () => {
    (useItineraryStore as jest.Mock).mockReturnValue({
      days: [{ day: 1, title: 'Day 1', stops: [{ id: 's1' }] }],
      totalCost: 0,
    });
    render(
      <MobileTripSheet>
        <p>Trip preview</p>
      </MobileTripSheet>
    );
    // Check inside the trigger button
    const trigger = screen.getByTestId('drawer-trigger');
    expect(trigger.textContent).toMatch(/1 day/);
    expect(trigger.textContent).not.toMatch(/1 days/);
  });

  it('shows "2 days" (plural) when there are 2 days', () => {
    (useItineraryStore as jest.Mock).mockReturnValue({
      days: [
        { day: 1, title: 'Day 1', stops: [{ id: 's1' }] },
        { day: 2, title: 'Day 2', stops: [{ id: 's2' }] },
      ],
      totalCost: 0,
    });
    render(
      <MobileTripSheet>
        <p>Trip preview</p>
      </MobileTripSheet>
    );
    const trigger = screen.getByTestId('drawer-trigger');
    expect(trigger.textContent).toMatch(/2 days/);
  });

  // ─── Cost display ─────────────────────────────────────────────────────────

  it('shows cost when totalCost > 0', () => {
    (useItineraryStore as jest.Mock).mockReturnValue({
      days: [{ day: 1, title: 'Day 1', stops: [{ id: 's1' }] }],
      totalCost: 250,
    });
    render(
      <MobileTripSheet>
        <p>Trip preview</p>
      </MobileTripSheet>
    );
    // Cost is shown in the trigger pill
    const trigger = screen.getByTestId('drawer-trigger');
    expect(trigger.textContent).toContain('250');
  });

  it('does not show cost section when totalCost is 0', () => {
    (useItineraryStore as jest.Mock).mockReturnValue({
      days: [{ day: 1, title: 'Day 1', stops: [{ id: 's1' }] }],
      totalCost: 0,
    });
    render(
      <MobileTripSheet>
        <p>Trip preview</p>
      </MobileTripSheet>
    );
    // The trigger button should not show "$0"
    const trigger = screen.getByTestId('drawer-trigger');
    expect(trigger.textContent).not.toContain('$0');
  });

  // ─── Content ──────────────────────────────────────────────────────────────

  it('renders children inside the drawer content', () => {
    (useItineraryStore as jest.Mock).mockReturnValue({
      days: [{ day: 1, title: 'Day 1', stops: [{ id: 's1' }] }],
      totalCost: 0,
    });
    render(
      <MobileTripSheet>
        <p data-testid="trip-preview">My trip preview</p>
      </MobileTripSheet>
    );
    expect(screen.getByTestId('trip-preview')).toBeInTheDocument();
    expect(screen.getByText('My trip preview')).toBeInTheDocument();
  });

  it('shows "Your Trip" header in the drawer content', () => {
    (useItineraryStore as jest.Mock).mockReturnValue({
      days: [{ day: 1, title: 'Day 1', stops: [{ id: 's1' }] }],
      totalCost: 100,
    });
    render(
      <MobileTripSheet>
        <p>content</p>
      </MobileTripSheet>
    );
    expect(screen.getByText('Your Trip')).toBeInTheDocument();
  });

  it('shows "View ↑" in the trigger pill', () => {
    (useItineraryStore as jest.Mock).mockReturnValue({
      days: [{ day: 1, title: 'Day 1', stops: [{ id: 's1' }] }],
      totalCost: 0,
    });
    render(
      <MobileTripSheet>
        <p>content</p>
      </MobileTripSheet>
    );
    expect(screen.getByText('View ↑')).toBeInTheDocument();
  });
});
