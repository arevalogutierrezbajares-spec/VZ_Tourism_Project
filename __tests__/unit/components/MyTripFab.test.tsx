import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock useItineraryStore
jest.mock('@/stores/itinerary-store', () => {
  const mockFn = jest.fn();
  return { useItineraryStore: mockFn };
});

// Mock next/link
jest.mock('next/link', () => {
  const Link = ({ href, children, ...props }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  );
  Link.displayName = 'Link';
  return Link;
});

import { MyTripFab } from '@/components/itinerary/MyTripFab';
import { useItineraryStore } from '@/stores/itinerary-store';

const mockUseItineraryStore = useItineraryStore as jest.Mock;

describe('MyTripFab', () => {
  it('renders nothing when no active itinerary', () => {
    mockUseItineraryStore.mockReturnValue({ current: null, days: [] });
    const { container } = render(<MyTripFab />);
    expect(container.firstChild).toBeNull();
  });

  it('renders FAB when there is an active itinerary', () => {
    mockUseItineraryStore.mockReturnValue({
      current: { id: '1', title: 'My Trip' },
      days: [],
    });
    render(<MyTripFab />);
    expect(screen.getByRole('link', { name: /view my trip/i })).toBeInTheDocument();
    expect(screen.getByText('My Trip')).toBeInTheDocument();
  });

  it('links to /plan', () => {
    mockUseItineraryStore.mockReturnValue({
      current: { id: '1', title: 'My Trip' },
      days: [],
    });
    render(<MyTripFab />);
    expect(screen.getByRole('link', { name: /view my trip/i })).toHaveAttribute('href', '/plan');
  });

  it('shows no stop count badge when no stops', () => {
    mockUseItineraryStore.mockReturnValue({
      current: { id: '1', title: 'My Trip' },
      days: [],
    });
    render(<MyTripFab />);
    // Badge only renders when stopCount > 0
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows total stop count from all days', () => {
    mockUseItineraryStore.mockReturnValue({
      current: { id: '1', title: 'My Trip' },
      days: [
        { day: 1, stops: [{ id: 's1' }, { id: 's2' }] },
        { day: 2, stops: [{ id: 's3' }] },
      ],
    });
    render(<MyTripFab />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
