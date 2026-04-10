import type { User, Listing, Booking, Review, Itinerary, ItineraryStop, SafetyZone } from '@/types/database';

// ─── Users ─────────────────────────────────────────────────────────────────

export const mockUser: User = {
  id: 'user-uuid-1',
  email: 'tourist@example.com',
  full_name: 'Maria García',
  avatar_url: null,
  role: 'tourist',
  nationality: 'US',
  phone: '+1-555-0100',
  preferred_language: 'en',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

export const mockProviderUser: User = {
  id: 'user-uuid-2',
  email: 'provider@example.com',
  full_name: 'Carlos Rodríguez',
  avatar_url: null,
  role: 'provider',
  nationality: 'VE',
  phone: '+58-412-0000000',
  preferred_language: 'es',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

export const mockAdminUser: User = {
  id: 'user-uuid-3',
  email: 'admin@example.com',
  full_name: 'Admin User',
  avatar_url: null,
  role: 'admin',
  nationality: 'VE',
  phone: null,
  preferred_language: 'es',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

// ─── Listings ──────────────────────────────────────────────────────────────

export const mockListing: Listing = {
  id: 'listing-uuid-1',
  provider_id: 'provider-uuid-1',
  title: 'Mérida Mountain Trek with Local Guide',
  slug: 'merida-mountain-trek-local-guide-xyz',
  short_description: 'Explore the stunning Andes mountains with an expert local guide.',
  description: 'A full description of the trek experience in the Venezuelan Andes mountains with safety gear and equipment provided by our expert local guides. This is a detailed description that is well over 100 characters long to satisfy the validation requirements.',
  category: 'mountains',
  tags: ['hiking', 'trekking', 'photography'],
  region: 'Mérida',
  location_name: 'Sierra Nevada de Mérida',
  latitude: 8.6,
  longitude: -71.15,
  address: null,
  price_usd: 85,
  price_ves: null,
  currency: 'USD',
  duration_hours: 6,
  max_guests: 10,
  min_guests: 2,
  safety_level: 'green',
  amenities: ['Guide Included', 'Equipment Rental'],
  languages: ['es', 'en'],
  includes: ['Guide', 'Equipment'],
  excludes: ['Food', 'Transport'],
  cancellation_policy: 'moderate',
  meeting_point: 'Plaza Bolívar, Mérida',
  is_published: true,
  is_featured: false,
  cover_image_url: 'https://example.com/trek.jpg',
  rating: 4.8,
  total_reviews: 24,
  total_bookings: 48,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

export const mockListingBeach: Listing = {
  ...mockListing,
  id: 'listing-uuid-2',
  title: 'Los Roques Snorkeling Day Trip',
  slug: 'los-roques-snorkeling-day-trip-abc',
  short_description: 'Crystal-clear Caribbean waters await you on this amazing day trip.',
  category: 'beaches',
  region: 'Los Roques',
  location_name: 'Los Roques Archipelago',
  price_usd: 120,
  safety_level: 'green',
  rating: 4.9,
  total_reviews: 56,
  total_bookings: 112,
};

export const mockListings: Listing[] = [mockListing, mockListingBeach];

// ─── Bookings ──────────────────────────────────────────────────────────────

export const mockBooking: Booking = {
  id: 'booking-uuid-1',
  listing_id: 'listing-uuid-1',
  tourist_id: 'user-uuid-1',
  provider_id: 'provider-uuid-1',
  check_in: '2026-04-15',
  check_out: null,
  guests: 2,
  total_usd: 170,
  platform_fee_usd: 20.4,
  provider_amount_usd: 149.6,
  status: 'pending',
  notes: null,
  special_requests: 'Vegetarian meals please',
  stripe_payment_intent_id: null,
  stripe_checkout_session_id: null,
  cancellation_reason: null,
  refund_amount_usd: null,
  confirmed_at: null,
  cancelled_at: null,
  completed_at: null,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

export const mockCompletedBooking: Booking = {
  ...mockBooking,
  id: 'booking-uuid-2',
  status: 'completed',
  completed_at: '2026-04-16T00:00:00Z',
};

export const mockBookings: Booking[] = [mockBooking, mockCompletedBooking];

// ─── Reviews ───────────────────────────────────────────────────────────────

export const mockReview: Review = {
  id: 'review-uuid-1',
  booking_id: 'booking-uuid-2',
  listing_id: 'listing-uuid-1',
  tourist_id: 'user-uuid-1',
  rating: 5,
  title: 'Incredible experience!',
  body: 'Absolutely loved every moment of this trek. The guide was knowledgeable and the views were breathtaking.',
  photos: [],
  is_approved: true,
  provider_response: null,
  created_at: '2026-03-20T00:00:00Z',
  updated_at: '2026-03-20T00:00:00Z',
};

// ─── Itineraries ───────────────────────────────────────────────────────────

export const mockItineraryStop: ItineraryStop = {
  id: 'stop-uuid-1',
  itinerary_id: 'itinerary-uuid-1',
  listing_id: 'listing-uuid-1',
  day: 1,
  order: 0,
  title: 'Mérida Mountain Trek',
  description: 'Full day trek',
  latitude: 8.6,
  longitude: -71.15,
  location_name: 'Sierra Nevada de Mérida',
  start_time: '09:00',
  end_time: '15:00',
  duration_hours: 6,
  cost_usd: 85,
  transport_to_next: 'car',
  transport_duration_minutes: 30,
  notes: null,
  created_at: '2026-03-01T00:00:00Z',
};

export const mockItinerary: Itinerary = {
  id: 'itinerary-uuid-1',
  user_id: 'user-uuid-1',
  title: 'Venezuela Adventure Week',
  description: 'A week exploring the best of Venezuela',
  cover_image_url: null,
  start_date: '2026-04-15',
  end_date: '2026-04-22',
  total_days: 7,
  estimated_cost_usd: 850,
  is_public: false,
  is_template: false,
  is_influencer_pick: false,
  referral_code: null,
  regions: ['Mérida', 'Los Roques'],
  tags: ['adventure', 'nature'],
  likes: 0,
  saves: 0,
  views: 0,
  stops: [mockItineraryStop],
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

// ─── Safety Zones ──────────────────────────────────────────────────────────

export const mockSafetyZone: SafetyZone = {
  id: 'zone-uuid-1',
  name: 'Los Roques',
  description: 'Pristine archipelago, very safe for tourists',
  level: 'green',
  region: 'Los Roques',
  geometry: {
    type: 'Polygon',
    coordinates: [[[-67.0, 11.5], [-66.5, 11.5], [-66.5, 12.2], [-67.0, 12.2], [-67.0, 11.5]]],
  },
  tips: ['Stay on marked paths', 'Keep valuables secured'],
  emergency_contacts: [
    { name: 'Tourist Police', phone: '+58-212-0000', type: 'tourist_police' },
  ],
  last_updated: '2026-03-01T00:00:00Z',
  created_at: '2025-01-01T00:00:00Z',
};

export const mockSafetyZones: SafetyZone[] = [mockSafetyZone];
