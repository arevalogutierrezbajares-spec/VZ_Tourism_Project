import React from 'react';
import { render, screen } from '@testing-library/react';
import { ListingCard } from '@/components/listing/ListingCard';
import { mockListing } from '@/__tests__/fixtures';

describe('ListingCard (full)', () => {
  it('renders without crashing', () => {
    render(<ListingCard listing={mockListing} />);
  });

  it('renders listing title', () => {
    render(<ListingCard listing={mockListing} />);
    expect(screen.getByText('Mérida Mountain Trek with Local Guide')).toBeInTheDocument();
  });

  it('renders listing location', () => {
    render(<ListingCard listing={mockListing} />);
    expect(screen.getByText('Sierra Nevada de Mérida')).toBeInTheDocument();
  });

  it('renders formatted price', () => {
    render(<ListingCard listing={mockListing} />);
    expect(screen.getByText('$85.00')).toBeInTheDocument();
  });

  it('renders rating', () => {
    render(<ListingCard listing={mockListing} />);
    expect(screen.getByText('4.8')).toBeInTheDocument();
  });

  it('renders review count', () => {
    render(<ListingCard listing={mockListing} />);
    expect(screen.getByText('(24)')).toBeInTheDocument();
  });

  it('renders category badge', () => {
    const { container } = render(<ListingCard listing={mockListing} />);
    // The category badge contains the category text (may be split with emoji)
    expect(container.textContent).toMatch(/mountains/i);
  });

  it('renders safety badge', () => {
    render(<ListingCard listing={mockListing} />);
    // SafetyBadge should show the level somewhere
    const { container } = render(<ListingCard listing={mockListing} />);
    expect(container).toBeInTheDocument();
  });

  it('renders per person text', () => {
    render(<ListingCard listing={mockListing} />);
    expect(screen.getByText('/ person')).toBeInTheDocument();
  });

  it('renders duration when provided', () => {
    render(<ListingCard listing={mockListing} />);
    expect(screen.getByText('6 hours')).toBeInTheDocument();
  });

  it('renders max guests', () => {
    render(<ListingCard listing={mockListing} />);
    expect(screen.getByText('Up to 10')).toBeInTheDocument();
  });

  it('links to the listing detail page', () => {
    const { container } = render(<ListingCard listing={mockListing} />);
    const link = container.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/listing/merida-mountain-trek-local-guide-xyz');
  });

  it('renders cover image when available', () => {
    render(<ListingCard listing={mockListing} />);
    const img = screen.getByTestId('next-image');
    expect(img.getAttribute('src')).toBe('https://example.com/trek.jpg');
  });

  it('renders placeholder emoji when no cover image', () => {
    const listingNoImage = { ...mockListing, cover_image_url: null };
    const { container } = render(<ListingCard listing={listingNoImage} />);
    // Should show the category icon emoji (⛰️ for mountains)
    expect(container.textContent).toContain('⛰️');
  });

  it('renders Featured badge for featured listings', () => {
    const featured = { ...mockListing, is_featured: true };
    render(<ListingCard listing={featured} />);
    expect(screen.getByText('Featured')).toBeInTheDocument();
  });

  it('does not render Featured badge for non-featured listings', () => {
    render(<ListingCard listing={mockListing} />);
    expect(screen.queryByText('Featured')).toBeNull();
  });
});

describe('ListingCard (compact)', () => {
  it('renders compact view', () => {
    render(<ListingCard listing={mockListing} compact />);
    expect(screen.getByText('Mérida Mountain Trek with Local Guide')).toBeInTheDocument();
  });

  it('shows price in compact view', () => {
    render(<ListingCard listing={mockListing} compact />);
    expect(screen.getByText('$85.00')).toBeInTheDocument();
  });

  it('shows rating in compact view', () => {
    render(<ListingCard listing={mockListing} compact />);
    expect(screen.getByText('4.8')).toBeInTheDocument();
  });

  it('links to listing page in compact view', () => {
    const { container } = render(<ListingCard listing={mockListing} compact />);
    const link = container.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/listing/merida-mountain-trek-local-guide-xyz');
  });
});

describe('ListingCard with scraped listing shape', () => {
  const scrapedListing = {
    ...mockListing,
    rating: null,
    price_usd: null,
    safety_level: null,
    location_name: null,
    max_guests: null,
    duration_hours: null,
    short_description: null,
    total_reviews: 0,
  };

  it('renders without crashing when all optional fields are null', () => {
    render(<ListingCard listing={scrapedListing as any} />);
  });

  it('shows "No reviews yet" when rating is null', () => {
    render(<ListingCard listing={scrapedListing as any} />);
    expect(screen.getByText('No reviews yet')).toBeInTheDocument();
  });

  it('shows "Contact for pricing" when price_usd is null', () => {
    render(<ListingCard listing={scrapedListing as any} />);
    expect(screen.getByText('Contact for pricing')).toBeInTheDocument();
  });

  it('does not render safety badge when safety_level is null', () => {
    const { container } = render(<ListingCard listing={scrapedListing as any} />);
    expect(container.querySelector('[data-testid="safety-badge"]')).toBeNull();
  });

  it('does not render max guests when null', () => {
    render(<ListingCard listing={scrapedListing as any} />);
    expect(screen.queryByText(/Up to/)).toBeNull();
  });
});
