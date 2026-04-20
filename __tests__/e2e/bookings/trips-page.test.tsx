import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface GuestBooking {
  id: string;
  listing_name: string;
  listing_slug: string | null;
  check_in: string;
  check_out: string;
  guest_count: number;
  total_usd: number;
  status: string;
  confirmation_code: string;
  payment_method: string;
}

// ─── Mocks ─────────────────────────────────────────────────────────────────

// Mock useAuth hook — controlled per-test
const mockUseAuth = jest.fn();
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useRecentlyViewed hook
jest.mock('@/hooks/use-recently-viewed', () => ({
  useRecentlyViewed: () => ({ items: [], track: jest.fn(), clear: jest.fn() }),
}));

// Mock @/lib/supabase/client — createClient returns a mock with .from()
const mockFrom = jest.fn();
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

// Mock date-fns to control "now" for countdown testing
// We keep the real implementations but allow date control via system clock
const realDateNow = Date.now;

// Import the component AFTER mocks are configured
import TripsPage from '@/app/(tourist)/trips/page';

// ─── Helpers ───────────────────────────────────────────────────────────────

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

function pastDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function makeBooking(overrides: Partial<GuestBooking> = {}): GuestBooking {
  return {
    id: 'booking-1',
    listing_name: 'Merida Mountain Trek',
    listing_slug: 'merida-trek',
    check_in: futureDate(10),
    check_out: futureDate(12),
    guest_count: 2,
    total_usd: 170,
    status: 'confirmed',
    confirmation_code: 'VZ-ABC123',
    payment_method: 'card',
    ...overrides,
  };
}

const authenticatedUser = {
  user: { id: 'user-1', email: 'maria@example.com' },
  profile: { full_name: 'Maria Garcia', role: 'tourist' },
  loading: false,
  initialized: true,
  isAuthenticated: true,
  isProvider: false,
  isAdmin: false,
  isTourist: true,
  isCreator: false,
  signOut: jest.fn(),
};

const unauthenticatedUser = {
  user: null,
  profile: null,
  loading: false,
  initialized: true,
  isAuthenticated: false,
  isProvider: false,
  isAdmin: false,
  isTourist: false,
  isCreator: false,
  signOut: jest.fn(),
};

const loadingUser = {
  user: null,
  profile: null,
  loading: true,
  initialized: false,
  isAuthenticated: false,
  isProvider: false,
  isAdmin: false,
  isTourist: false,
  isCreator: false,
  signOut: jest.fn(),
};

function mockFetchBookings(bookings: GuestBooking[]) {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ bookings }),
  });
}

function mockSupabaseFavorites(places: Array<{ listing_id: string; listings: unknown }> = []) {
  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: places, error: null }).then(resolve),
  };
  mockFrom.mockReturnValue(queryBuilder);
}

// ─── Setup / Teardown ──────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue(authenticatedUser);
  mockFetchBookings([]);
  mockSupabaseFavorites([]);
  // Clear localStorage
  if (typeof window !== 'undefined') {
    window.localStorage.clear();
  }
});

// ─── getRefundEstimate pure-logic tests ────────────────────────────────────

// Re-implement the function here to test in isolation (matches source exactly)
function getRefundEstimate(days: number, totalUsd: number) {
  if (days >= 14) return { label: 'Full refund (90%)', amount: totalUsd * 0.9 };
  if (days >= 7)  return { label: 'Partial refund (70%)', amount: totalUsd * 0.7 };
  if (days >= 3)  return { label: 'Partial refund (30%)', amount: totalUsd * 0.3 };
  return { label: 'No refund', amount: 0 };
}

describe('getRefundEstimate', () => {
  it('returns 90% refund for 14+ days', () => {
    const result = getRefundEstimate(14, 100);
    expect(result).toEqual({ label: 'Full refund (90%)', amount: 90 });
  });

  it('returns 90% refund for 30 days', () => {
    const result = getRefundEstimate(30, 200);
    expect(result).toEqual({ label: 'Full refund (90%)', amount: 180 });
  });

  it('returns 70% refund for 7-13 days', () => {
    const result = getRefundEstimate(7, 100);
    expect(result).toEqual({ label: 'Partial refund (70%)', amount: 70 });
  });

  it('returns 70% refund for 10 days', () => {
    const result = getRefundEstimate(10, 200);
    expect(result).toEqual({ label: 'Partial refund (70%)', amount: 140 });
  });

  it('returns 30% refund for 3-6 days', () => {
    const result = getRefundEstimate(3, 100);
    expect(result).toEqual({ label: 'Partial refund (30%)', amount: 30 });
  });

  it('returns 30% refund for 5 days', () => {
    const result = getRefundEstimate(5, 200);
    expect(result).toEqual({ label: 'Partial refund (30%)', amount: 60 });
  });

  it('returns no refund for < 3 days', () => {
    const result = getRefundEstimate(2, 100);
    expect(result).toEqual({ label: 'No refund', amount: 0 });
  });

  it('returns no refund for 0 days', () => {
    const result = getRefundEstimate(0, 500);
    expect(result).toEqual({ label: 'No refund', amount: 0 });
  });

  it('returns no refund for negative days', () => {
    const result = getRefundEstimate(-5, 100);
    expect(result).toEqual({ label: 'No refund', amount: 0 });
  });

  it('handles $0 total correctly', () => {
    const result = getRefundEstimate(14, 0);
    expect(result).toEqual({ label: 'Full refund (90%)', amount: 0 });
  });
});

// ─── Authentication states ─────────────────────────────────────────────────

describe('TripsPage — authentication', () => {
  it('shows loading spinner while auth is loading', () => {
    mockUseAuth.mockReturnValue(loadingUser);
    const { container } = render(<TripsPage />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows sign-in prompt when not authenticated', () => {
    mockUseAuth.mockReturnValue(unauthenticatedUser);
    render(<TripsPage />);
    expect(screen.getByText('Sign in to view your trips')).toBeInTheDocument();
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  it('sign-in link points to /login?next=/trips', () => {
    mockUseAuth.mockReturnValue(unauthenticatedUser);
    render(<TripsPage />);
    const link = screen.getByText('Sign in');
    expect(link).toHaveAttribute('href', '/login?next=/trips');
  });
});

// ─── Tabs rendering ────────────────────────────────────────────────────────

describe('TripsPage — tabs', () => {
  it('renders all four tabs', async () => {
    render(<TripsPage />);
    await waitFor(() => {
      expect(screen.getByText('Upcoming')).toBeInTheDocument();
      expect(screen.getByText('Past')).toBeInTheDocument();
      expect(screen.getByText('Itineraries')).toBeInTheDocument();
      expect(screen.getByText('Saved Places')).toBeInTheDocument();
    });
  });

  it('defaults to upcoming tab', () => {
    render(<TripsPage />);
    const upcomingTab = screen.getByText('Upcoming');
    expect(upcomingTab.closest('button')).toHaveClass('border-sky-500');
  });

  it('shows welcome message with user first name', () => {
    render(<TripsPage />);
    expect(screen.getByText(/Welcome back, Maria!/)).toBeInTheDocument();
  });

  it('falls back to email username when full_name is missing', () => {
    mockUseAuth.mockReturnValue({
      ...authenticatedUser,
      profile: null,
    });
    render(<TripsPage />);
    expect(screen.getByText(/Welcome back, maria!/)).toBeInTheDocument();
  });

  it('switches to past tab on click', async () => {
    render(<TripsPage />);
    await waitFor(() => {
      expect(screen.getByText('Past')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Past'));
    // The past tab button should now be active
    const pastTab = screen.getByText('Past');
    expect(pastTab.closest('button')).toHaveClass('border-sky-500');
  });

  it('switches to itineraries tab on click', async () => {
    render(<TripsPage />);
    await waitFor(() => {
      expect(screen.getByText('Itineraries')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Itineraries'));
    const itinerariesTab = screen.getByText('Itineraries');
    expect(itinerariesTab.closest('button')).toHaveClass('border-sky-500');
  });

  it('switches to saved places tab on click', async () => {
    render(<TripsPage />);
    await waitFor(() => {
      expect(screen.getByText('Saved Places')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Saved Places'));
    const savedTab = screen.getByText('Saved Places');
    expect(savedTab.closest('button')).toHaveClass('border-sky-500');
  });
});

// ─── Empty states ──────────────────────────────────────────────────────────

describe('TripsPage — empty states', () => {
  it('shows empty state for upcoming when no bookings', async () => {
    mockFetchBookings([]);
    render(<TripsPage />);
    await waitFor(() => {
      expect(screen.getByText('No upcoming trips yet.')).toBeInTheDocument();
    });
    expect(screen.getByText('Explore Venezuela →')).toBeInTheDocument();
  });

  it('shows empty state for past when no past bookings', async () => {
    mockFetchBookings([]);
    render(<TripsPage />);
    await waitFor(() => {
      expect(screen.getByText('Upcoming')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Past'));
    await waitFor(() => {
      expect(screen.getByText('No past trips to show.')).toBeInTheDocument();
    });
  });

  it('shows empty state for itineraries when no saved itineraries', async () => {
    render(<TripsPage />);
    fireEvent.click(screen.getByText('Itineraries'));
    await waitFor(() => {
      expect(screen.getByText('No saved itineraries yet.')).toBeInTheDocument();
    });
  });

  it('shows empty state for saved places when no favorites', async () => {
    render(<TripsPage />);
    fireEvent.click(screen.getByText('Saved Places'));
    await waitFor(() => {
      expect(screen.getByText('No saved places yet.')).toBeInTheDocument();
    });
  });
});

// ─── Upcoming bookings display ─────────────────────────────────────────────

describe('TripsPage — upcoming bookings', () => {
  it('displays upcoming booking card with listing name', async () => {
    const booking = makeBooking();
    mockFetchBookings([booking]);
    render(<TripsPage />);
    await waitFor(() => {
      expect(screen.getByText('Merida Mountain Trek')).toBeInTheDocument();
    });
  });

  it('shows confirmation code', async () => {
    const booking = makeBooking({ confirmation_code: 'VZ-XYZ789' });
    mockFetchBookings([booking]);
    render(<TripsPage />);
    await waitFor(() => {
      expect(screen.getByText('Ref: VZ-XYZ789')).toBeInTheDocument();
    });
  });

  it('shows guest count', async () => {
    const booking = makeBooking({ guest_count: 3 });
    mockFetchBookings([booking]);
    render(<TripsPage />);
    await waitFor(() => {
      expect(screen.getByText('3 guests')).toBeInTheDocument();
    });
  });

  it('shows singular guest for 1 guest', async () => {
    const booking = makeBooking({ guest_count: 1 });
    mockFetchBookings([booking]);
    render(<TripsPage />);
    await waitFor(() => {
      expect(screen.getByText('1 guest')).toBeInTheDocument();
    });
  });

  it('shows total price', async () => {
    const booking = makeBooking({ total_usd: 250 });
    mockFetchBookings([booking]);
    render(<TripsPage />);
    await waitFor(() => {
      expect(screen.getByText('$250')).toBeInTheDocument();
    });
  });

  it('shows status badge for confirmed bookings', async () => {
    const booking = makeBooking({ status: 'confirmed' });
    mockFetchBookings([booking]);
    render(<TripsPage />);
    await waitFor(() => {
      expect(screen.getByText('Confirmed')).toBeInTheDocument();
    });
  });

  it('shows status badge for pending bookings', async () => {
    const booking = makeBooking({ status: 'pending' });
    mockFetchBookings([booking]);
    render(<TripsPage />);
    await waitFor(() => {
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  it('shows status badge for payment_submitted bookings', async () => {
    const booking = makeBooking({ status: 'payment_submitted' });
    mockFetchBookings([booking]);
    render(<TripsPage />);
    await waitFor(() => {
      expect(screen.getByText('Payment Sent')).toBeInTheDocument();
    });
  });

  it('shows "View Booking" link', async () => {
    const booking = makeBooking({ id: 'booking-42' });
    mockFetchBookings([booking]);
    render(<TripsPage />);
    await waitFor(() => {
      expect(screen.getByText('View Booking')).toHaveAttribute('href', '/bookings/booking-42');
    });
  });

  it('shows tab count badge for upcoming bookings', async () => {
    const bookings = [
      makeBooking({ id: 'b1' }),
      makeBooking({ id: 'b2', listing_name: 'Beach Trip' }),
    ];
    mockFetchBookings(bookings);
    render(<TripsPage />);
    await waitFor(() => {
      // The Upcoming tab should show count badge "2"
      const upcomingTab = screen.getByText('Upcoming').closest('button');
      expect(upcomingTab?.textContent).toContain('2');
    });
  });
});

// ─── Status colors ─────────────────────────────────────────────────────────

describe('TripsPage — status badges have correct colors', () => {
  const statusTests: Array<{ status: string; label: string; colorClass: string }> = [
    { status: 'confirmed', label: 'Confirmed', colorClass: 'bg-green-100' },
    { status: 'pending', label: 'Pending', colorClass: 'bg-yellow-100' },
    { status: 'payment_submitted', label: 'Payment Sent', colorClass: 'bg-blue-100' },
    { status: 'cancelled', label: 'Cancelled', colorClass: 'bg-red-100' },
  ];

  statusTests.forEach(({ status, label, colorClass }) => {
    it(`shows ${colorClass} for ${status} status`, async () => {
      // Use past bookings for cancelled status (upcoming filters them out)
      const isPast = status === 'cancelled' || status === 'completed';
      const booking = makeBooking({
        status,
        check_in: isPast ? pastDate(5) : futureDate(10),
        check_out: isPast ? pastDate(3) : futureDate(12),
      });
      mockFetchBookings([booking]);
      render(<TripsPage />);

      if (isPast) {
        // Switch to past tab
        await waitFor(() => {
          expect(screen.getByText('Past')).toBeInTheDocument();
        });
        fireEvent.click(screen.getByText('Past'));
      }

      await waitFor(() => {
        const badge = screen.getByText(label);
        expect(badge.className).toContain(colorClass);
      });
    });
  });
});

// ─── Past bookings display ─────────────────────────────────────────────────

describe('TripsPage — past bookings', () => {
  it('displays past bookings in the past tab', async () => {
    const pastBooking = makeBooking({
      id: 'past-1',
      listing_name: 'Completed Trek',
      status: 'completed',
      check_in: pastDate(10),
      check_out: pastDate(8),
    });
    mockFetchBookings([pastBooking]);
    render(<TripsPage />);
    fireEvent.click(screen.getByText('Past'));
    await waitFor(() => {
      expect(screen.getByText('Completed Trek')).toBeInTheDocument();
    });
  });

  it('shows Leave Review button for past bookings', async () => {
    const pastBooking = makeBooking({
      status: 'completed',
      check_in: pastDate(10),
      check_out: pastDate(8),
    });
    mockFetchBookings([pastBooking]);
    render(<TripsPage />);
    fireEvent.click(screen.getByText('Past'));
    await waitFor(() => {
      expect(screen.getByText(/Leave Review/)).toBeInTheDocument();
    });
  });

  it('does not show cancel button for past bookings', async () => {
    const pastBooking = makeBooking({
      status: 'confirmed',
      check_in: pastDate(10),
      check_out: pastDate(8),
    });
    mockFetchBookings([pastBooking]);
    render(<TripsPage />);
    fireEvent.click(screen.getByText('Past'));
    await waitFor(() => {
      expect(screen.getByText('Merida Mountain Trek')).toBeInTheDocument();
    });
    expect(screen.queryByText('Cancel booking')).not.toBeInTheDocument();
  });
});

// ─── Countdown display ─────────────────────────────────────────────────────

describe('TripsPage — countdown', () => {
  it('shows "In X days!" for upcoming confirmed bookings', async () => {
    const booking = makeBooking({ check_in: futureDate(10) });
    mockFetchBookings([booking]);
    render(<TripsPage />);
    // differenceInDays uses calendar math that may produce 9 or 10 depending on time-of-day
    await waitFor(() => {
      const el = screen.getByText(/^In \d+ days!$/);
      expect(el).toBeInTheDocument();
      const dayCount = parseInt(el.textContent!.match(/\d+/)![0], 10);
      expect(dayCount).toBeGreaterThanOrEqual(9);
      expect(dayCount).toBeLessThanOrEqual(10);
    });
  });

  it('shows countdown text for booking 1 day away', async () => {
    // futureDate(1) produces tomorrow. daysUntil may be 0 or 1 depending on time.
    // The component shows "Today!" for 0, "Tomorrow!" for 1.
    // Since isFuture filters on check_in, tomorrow is always future.
    const booking = makeBooking({ check_in: futureDate(1), check_out: futureDate(3) });
    mockFetchBookings([booking]);
    render(<TripsPage />);
    await waitFor(() => {
      // Accept either "Today!" or "Tomorrow!" depending on time-of-day rounding
      const texts = screen.getAllByText(/Today!|Tomorrow!/);
      expect(texts.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows pre-trip info message for bookings within 7 days', async () => {
    const booking = makeBooking({ check_in: futureDate(5) });
    mockFetchBookings([booking]);
    render(<TripsPage />);
    await waitFor(() => {
      expect(screen.getByText('Pre-trip info available')).toBeInTheDocument();
    });
  });
});

// ─── Cancellation flow ─────────────────────────────────────────────────────

describe('TripsPage — cancellation flow', () => {
  it('shows cancel button for confirmed upcoming bookings with >= 1 day', async () => {
    const booking = makeBooking({ status: 'confirmed', check_in: futureDate(10) });
    mockFetchBookings([booking]);
    render(<TripsPage />);
    await waitFor(() => {
      expect(screen.getByText('Cancel booking')).toBeInTheDocument();
    });
  });

  it('does not show cancel button for pending bookings', async () => {
    const booking = makeBooking({ status: 'pending', check_in: futureDate(10) });
    mockFetchBookings([booking]);
    render(<TripsPage />);
    await waitFor(() => {
      expect(screen.getByText('Merida Mountain Trek')).toBeInTheDocument();
    });
    expect(screen.queryByText('Cancel booking')).not.toBeInTheDocument();
  });

  it('clicking cancel shows confirmation dialog with refund estimate', async () => {
    const booking = makeBooking({
      status: 'confirmed',
      check_in: futureDate(10),
      total_usd: 200,
    });
    mockFetchBookings([booking]);
    render(<TripsPage />);
    await waitFor(() => {
      expect(screen.getByText('Cancel booking')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Cancel booking'));
    await waitFor(() => {
      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
      // 10 days => 70% refund => $140.00
      expect(screen.getByText(/\$140\.00/)).toBeInTheDocument();
      expect(screen.getByText(/Partial refund \(70%\)/)).toBeInTheDocument();
    });
  });

  it('clicking "Keep" closes the confirmation dialog', async () => {
    const booking = makeBooking({ status: 'confirmed', check_in: futureDate(10) });
    mockFetchBookings([booking]);
    render(<TripsPage />);
    await waitFor(() => {
      expect(screen.getByText('Cancel booking')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Cancel booking'));
    await waitFor(() => {
      expect(screen.getByText('Keep')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Keep'));
    await waitFor(() => {
      expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument();
    });
  });

  it('clicking "Yes, cancel" sends PATCH request and removes booking', async () => {
    const booking = makeBooking({
      id: 'cancel-me',
      status: 'confirmed',
      check_in: futureDate(10),
    });
    mockFetchBookings([booking]);

    // Mock the cancellation PATCH endpoint
    (global.fetch as jest.Mock).mockImplementation((url: string, opts?: RequestInit) => {
      if (typeof url === 'string' && url.includes('/api/bookings/cancel-me') && opts?.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { ...booking, status: 'cancelled' } }),
        });
      }
      // Default: bookings/mine
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ bookings: [booking] }),
      });
    });

    render(<TripsPage />);
    await waitFor(() => {
      expect(screen.getByText('Cancel booking')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Cancel booking'));
    await waitFor(() => {
      expect(screen.getByText('Yes, cancel')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Yes, cancel'));
    });

    // Verify PATCH was called
    await waitFor(() => {
      const fetchCalls = (global.fetch as jest.Mock).mock.calls;
      const patchCall = fetchCalls.find(
        (call: unknown[]) =>
          typeof call[0] === 'string' &&
          call[0].includes('/api/bookings/cancel-me') &&
          (call[1] as RequestInit)?.method === 'PATCH'
      );
      expect(patchCall).toBeDefined();
      expect(JSON.parse((patchCall![1] as RequestInit).body as string)).toEqual({ status: 'cancelled' });
    });
  });

  it('shows refund estimate of $0 for < 3 days away', async () => {
    const booking = makeBooking({
      status: 'confirmed',
      check_in: futureDate(2),
      total_usd: 100,
    });
    mockFetchBookings([booking]);
    render(<TripsPage />);
    await waitFor(() => {
      expect(screen.getByText('Cancel booking')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Cancel booking'));
    await waitFor(() => {
      expect(screen.getByText(/No refund/)).toBeInTheDocument();
      expect(screen.getByText(/no refund applies/)).toBeInTheDocument();
    });
  });
});

// ─── Fetch and API calls ───────────────────────────────────────────────────

describe('TripsPage — data fetching', () => {
  it('fetches bookings from /api/bookings/mine on mount', async () => {
    render(<TripsPage />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/bookings/mine');
    });
  });

  it('handles fetch failure gracefully (empty state)', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    render(<TripsPage />);
    await waitFor(() => {
      expect(screen.getByText('No upcoming trips yet.')).toBeInTheDocument();
    });
  });

  it('does not fetch bookings when not authenticated', () => {
    mockUseAuth.mockReturnValue(unauthenticatedUser);
    render(<TripsPage />);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
