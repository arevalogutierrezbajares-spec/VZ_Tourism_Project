import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListingDetail } from '@/components/listing/ListingDetail';
import { mockListing, mockReview, mockUser } from '@/__tests__/fixtures';
import type { Listing, Review } from '@/types/database';

// ─── Mock hooks ────────────────────────────────────────────────────────────────

const mockTrack = jest.fn();
jest.mock('@/hooks/use-recently-viewed', () => ({
  useRecentlyViewed: () => ({ track: mockTrack, items: [], clear: jest.fn() }),
}));

const mockAddStop = jest.fn();
const mockOpenPanel = jest.fn();
jest.mock('@/stores/itinerary-store', () => ({
  useItineraryStore: jest.fn(() => ({
    addStop: mockAddStop,
    days: [],
    openPanel: mockOpenPanel,
    current: null,
  })),
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'user-1', email: 'test@example.com' },
    loading: false,
    profile: null,
  }),
}));

jest.mock('@/hooks/use-favorites', () => ({
  useFavorites: () => ({
    favorites: [],
    isFavorited: () => false,
    toggleFavorite: jest.fn(),
  }),
}));

jest.mock('@/stores/auth-store', () => ({
  useAuthStore: Object.assign(jest.fn(() => ({
    user: null,
    profile: null,
    loading: false,
    initialized: true,
    setUser: jest.fn(),
    setProfile: jest.fn(),
    setLoading: jest.fn(),
    setInitialized: jest.fn(),
    signOut: jest.fn(),
    updateProfile: jest.fn(),
  })), {
    getState: jest.fn(() => ({
      user: null,
      profile: null,
    })),
  }),
}));

// ─── Mock child components ─────────────────────────────────────────────────────

jest.mock('@/components/listing/BookingForm', () => ({
  BookingForm: ({ listing }: { listing: Listing }) => (
    <div data-testid="booking-form">BookingForm for {listing.title}</div>
  ),
}));

jest.mock('@/components/listing/ListingMap', () => ({
  ListingMap: ({ title }: { title: string }) => (
    <div data-testid="listing-map">Map: {title}</div>
  ),
}));

jest.mock('@/components/listing/ReviewSection', () => ({
  ReviewSection: ({ reviews, canReview }: { reviews: Review[]; canReview?: boolean }) => (
    <div data-testid="review-section">
      <span data-testid="review-count">{reviews.length} reviews</span>
      {canReview && <span data-testid="can-review">Can write review</span>}
    </div>
  ),
}));

jest.mock('@/components/common/ImageGallery', () => ({
  ImageGallery: ({ images }: { images: { url: string }[] }) => (
    <div data-testid="image-gallery">{images.length} images</div>
  ),
}));

jest.mock('@/components/common/SafetyBadge', () => ({
  SafetyBadge: ({ level }: { level: string }) => (
    <span data-testid="safety-badge">{level}</span>
  ),
}));

jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, ...props }: any) => <div data-testid="avatar" {...props}>{children}</div>,
  AvatarImage: (props: any) => <img data-testid="avatar-image" {...props} />,
  AvatarFallback: ({ children }: any) => <span data-testid="avatar-fallback">{children}</span>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span data-testid="badge" {...props}>{children}</span>,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}));

jest.mock('@/lib/utils', () => ({
  formatDuration: (hours: number) => `${hours}h`,
  pluralize: (count: number, singular: string) =>
    count === 1 ? `${count} ${singular}` : `${count} ${singular}s`,
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatRelativeDate: (date: string) => 'recently',
  getInitials: (name: string) => name.charAt(0),
}));

jest.mock('@/lib/constants', () => ({
  LISTING_CATEGORIES: [
    { value: 'mountains', label: 'Mountains', icon: '⛰️', description: '' },
    { value: 'beaches', label: 'Beaches', icon: '🏖️', description: '' },
  ],
}));

// ─── Helpers ───────────────────────────────────────────────────────────────────

const defaultReviews: Review[] = [
  {
    ...mockReview,
    tourist: { ...mockUser, full_name: 'Maria Garcia', avatar_url: null },
  },
];

function renderListingDetail(overrides?: {
  listing?: Partial<Listing>;
  reviews?: Review[];
  canReview?: boolean;
  bookingId?: string;
}) {
  const listing = { ...mockListing, ...overrides?.listing } as Listing;
  return render(
    <ListingDetail
      listing={listing}
      reviews={overrides?.reviews ?? defaultReviews}
      canReview={overrides?.canReview}
      bookingId={overrides?.bookingId}
    />
  );
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('ListingDetail - Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Rendering & Header ---

  describe('Header rendering', () => {
    it('renders the listing title', () => {
      renderListingDetail();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        mockListing.title
      );
    });

    it('displays the rating and review count', () => {
      renderListingDetail();
      expect(screen.getByText('4.8')).toBeInTheDocument();
      expect(screen.getByText('(24 reviews)')).toBeInTheDocument();
    });

    it('displays the location name', () => {
      renderListingDetail();
      const locationElements = screen.getAllByText(mockListing.location_name);
      expect(locationElements.length).toBeGreaterThanOrEqual(1);
    });

    it('renders category badge', () => {
      renderListingDetail();
      const badges = screen.getAllByTestId('badge');
      const categoryBadge = badges.find((b) =>
        b.textContent?.includes('mountains')
      );
      expect(categoryBadge).toBeDefined();
    });

    it('renders the safety badge', () => {
      renderListingDetail();
      expect(screen.getByTestId('safety-badge')).toHaveTextContent('green');
    });

    it('shows Featured badge when listing is featured', () => {
      renderListingDetail({ listing: { is_featured: true } });
      const badges = screen.getAllByTestId('badge');
      const featuredBadge = badges.find((b) =>
        b.textContent?.includes('Featured')
      );
      expect(featuredBadge).toBeDefined();
    });

    it('does not show Featured badge when listing is not featured', () => {
      renderListingDetail({ listing: { is_featured: false } });
      const badges = screen.getAllByTestId('badge');
      const featuredBadge = badges.find((b) =>
        b.textContent?.includes('Featured')
      );
      expect(featuredBadge).toBeUndefined();
    });
  });

  // --- Image Gallery ---

  describe('Image gallery', () => {
    it('renders the image gallery with cover image', () => {
      renderListingDetail();
      const gallery = screen.getByTestId('image-gallery');
      expect(gallery).toHaveTextContent('1 images');
    });

    it('renders gallery with photos when present', () => {
      renderListingDetail({
        listing: {
          photos: [
            { id: 'p1', listing_id: mockListing.id, url: 'https://example.com/1.jpg', alt: 'Photo 1', order: 0, created_at: '' },
            { id: 'p2', listing_id: mockListing.id, url: 'https://example.com/2.jpg', alt: 'Photo 2', order: 1, created_at: '' },
          ],
        },
      });
      const gallery = screen.getByTestId('image-gallery');
      // cover_image_url + 2 photos = 3
      expect(gallery).toHaveTextContent('3 images');
    });

    it('does not render gallery when no images exist', () => {
      renderListingDetail({
        listing: { cover_image_url: null, photos: [] },
      });
      expect(screen.queryByTestId('image-gallery')).not.toBeInTheDocument();
    });
  });

  // --- Quick Stats ---

  describe('Quick stats', () => {
    it('displays duration', () => {
      renderListingDetail();
      expect(screen.getByText('6h')).toBeInTheDocument();
      expect(screen.getByText('Duration')).toBeInTheDocument();
    });

    it('displays max guests', () => {
      renderListingDetail();
      expect(screen.getByText('Up to 10')).toBeInTheDocument();
      expect(screen.getByText('Guests')).toBeInTheDocument();
    });

    it('displays languages', () => {
      renderListingDetail();
      expect(screen.getByText('ES, EN')).toBeInTheDocument();
      expect(screen.getByText('Languages')).toBeInTheDocument();
    });
  });

  // --- Description ---

  describe('Description section', () => {
    it('renders About this experience heading', () => {
      renderListingDetail();
      expect(screen.getByText('About this experience')).toBeInTheDocument();
    });

    it('renders the listing description', () => {
      renderListingDetail();
      expect(screen.getByText(mockListing.description)).toBeInTheDocument();
    });
  });

  // --- Includes / Excludes ---

  describe('Includes and excludes', () => {
    it('renders included items', () => {
      renderListingDetail();
      expect(screen.getByText("What's included")).toBeInTheDocument();
      expect(screen.getByText('Guide')).toBeInTheDocument();
      expect(screen.getByText('Equipment')).toBeInTheDocument();
    });

    it('renders excluded items', () => {
      renderListingDetail();
      expect(screen.getByText('Not included')).toBeInTheDocument();
      expect(screen.getByText('Food')).toBeInTheDocument();
      expect(screen.getByText('Transport')).toBeInTheDocument();
    });

    it('hides includes/excludes section when both are empty', () => {
      renderListingDetail({ listing: { includes: [], excludes: [] } });
      expect(screen.queryByText("What's included")).not.toBeInTheDocument();
      expect(screen.queryByText('Not included')).not.toBeInTheDocument();
    });
  });

  // --- Reviews ---

  describe('Reviews section', () => {
    it('renders the review section with count in heading', () => {
      renderListingDetail();
      expect(screen.getByText((_content, element) => {
        return element?.tagName === 'H2' && element?.textContent === 'Reviews (1)';
      })).toBeInTheDocument();
      expect(screen.getByTestId('review-section')).toBeInTheDocument();
    });

    it('passes reviews to ReviewSection', () => {
      renderListingDetail();
      expect(screen.getByTestId('review-count')).toHaveTextContent('1 reviews');
    });

    it('passes canReview flag to ReviewSection', () => {
      renderListingDetail({ canReview: true, bookingId: 'booking-1' });
      expect(screen.getByTestId('can-review')).toBeInTheDocument();
    });

    it('shows Reviews heading without count when empty', () => {
      renderListingDetail({ reviews: [] });
      // "Reviews" without "(0)" when empty
      const heading = screen.getByText('Reviews');
      expect(heading).toBeInTheDocument();
      // Verify it does NOT include a count
      expect(heading.textContent?.trim()).toBe('Reviews');
    });
  });

  // --- Sidebar: Booking Form + Itinerary ---

  describe('Sidebar', () => {
    it('renders the booking form', () => {
      renderListingDetail();
      expect(screen.getByTestId('booking-form')).toBeInTheDocument();
    });

    it('renders Add to itinerary button', () => {
      renderListingDetail();
      expect(screen.getByText('+ Add to itinerary')).toBeInTheDocument();
    });

    it('calls addStop and openPanel when Add to itinerary is clicked', () => {
      renderListingDetail();
      fireEvent.click(screen.getByText('+ Add to itinerary'));
      expect(mockAddStop).toHaveBeenCalledTimes(1);
      expect(mockOpenPanel).toHaveBeenCalledTimes(1);
    });

    it('shows confirmation text after adding to itinerary', async () => {
      renderListingDetail();
      fireEvent.click(screen.getByText('+ Add to itinerary'));
      expect(screen.getByText(/Added to itinerary/)).toBeInTheDocument();
    });
  });

  // --- Map ---

  describe('Map section', () => {
    it('renders the map when lat/lng are present', () => {
      renderListingDetail();
      expect(screen.getByTestId('listing-map')).toBeInTheDocument();
    });

    it('does not render the map when lat/lng are missing', () => {
      renderListingDetail({ listing: { latitude: 0, longitude: 0 } });
      // 0 is falsy, so the map won't render
      expect(screen.queryByTestId('listing-map')).not.toBeInTheDocument();
    });
  });

  // --- Cancellation Policy ---

  describe('Cancellation policy', () => {
    it('displays the cancellation policy', () => {
      renderListingDetail();
      expect(screen.getByText('Cancellation policy')).toBeInTheDocument();
      expect(screen.getByText(mockListing.cancellation_policy)).toBeInTheDocument();
    });
  });

  // --- Recently Viewed Tracking ---

  describe('Recently viewed tracking', () => {
    it('calls track on mount with listing data', () => {
      renderListingDetail();
      expect(mockTrack).toHaveBeenCalledWith({
        id: mockListing.id,
        slug: mockListing.slug,
        title: mockListing.title,
        cover_image_url: mockListing.cover_image_url,
        location_name: mockListing.location_name,
        price_usd: mockListing.price_usd,
        category: mockListing.category,
      });
    });
  });

  // --- Mobile CTA ---

  describe('Mobile booking CTA', () => {
    it('renders the mobile Reserve button', () => {
      renderListingDetail();
      expect(screen.getByText('Reserve')).toBeInTheDocument();
    });

    it('displays the price in the mobile bar', () => {
      renderListingDetail();
      expect(screen.getByText('$85.00')).toBeInTheDocument();
    });
  });

  // --- Provider (optional field) ---

  describe('Provider section', () => {
    it('does not render provider section when provider is undefined', () => {
      renderListingDetail();
      expect(screen.queryByText('Your host')).not.toBeInTheDocument();
    });

    it('renders provider section when provider is set', () => {
      renderListingDetail({
        listing: {
          provider: {
            id: 'prov-1',
            user_id: 'user-2',
            business_name: 'Adventure Tours VE',
            description: 'Best tours in Venezuela',
            region: 'Merida',
            is_verified: true,
            rating: 4.9,
            total_reviews: 50,
            logo_url: null,
            whatsapp_number: null,
            created_at: '',
            updated_at: '',
          } as any,
        },
      });
      expect(screen.getByText('Your host')).toBeInTheDocument();
      expect(screen.getByText('Adventure Tours VE')).toBeInTheDocument();
    });
  });
});
