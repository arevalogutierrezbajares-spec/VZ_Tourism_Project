import React from 'react';
import { render, screen } from '@testing-library/react';
import { ItineraryFeedCard } from '@/components/social/ItineraryFeedCard';
import { mockItinerary, mockUser } from '@/__tests__/fixtures';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

const publicItinerary = {
  ...mockItinerary,
  is_public: true,
  saves: 50,
  likes: 30,
  user: mockUser,
  cover_image_url: 'https://example.com/image.jpg',
};

describe('ItineraryFeedCard', () => {
  it('renders without showActions (default)', () => {
    render(<ItineraryFeedCard itinerary={publicItinerary} />);

    expect(screen.getByText('Venezuela Adventure Week')).toBeInTheDocument();
    expect(screen.getByText('Maria García')).toBeInTheDocument();
    expect(screen.queryByText('Book This Trip')).not.toBeInTheDocument();
    expect(screen.queryByText('Customize')).not.toBeInTheDocument();
  });

  it('renders with showActions=true', () => {
    render(<ItineraryFeedCard itinerary={publicItinerary} showActions />);

    expect(screen.getByText('Book This Trip')).toBeInTheDocument();
    expect(screen.getByText('Customize')).toBeInTheDocument();
  });

  it('shows recommendation count when showActions is true', () => {
    const itinWithRecs = { ...publicItinerary, recommendation_count: 80 };
    render(<ItineraryFeedCard itinerary={itinWithRecs} showActions />);

    expect(screen.getByText('80 recommend')).toBeInTheDocument();
  });

  it('shows duration badge on cover image', () => {
    render(<ItineraryFeedCard itinerary={publicItinerary} showActions />);

    // '7 days' appears in both the cover image badge and the card body row
    const badges = screen.getAllByText('7 days');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('shows region badge on cover image', () => {
    render(<ItineraryFeedCard itinerary={publicItinerary} showActions />);

    expect(screen.getByText('Mérida')).toBeInTheDocument();
  });

  it('renders without cover image', () => {
    const noCover = { ...publicItinerary, cover_image_url: null };
    render(<ItineraryFeedCard itinerary={noCover} showActions />);

    expect(screen.getByText('Venezuela Adventure Week')).toBeInTheDocument();
  });
});
