/**
 * Shared test data constants for E2E tests.
 * Mirrors the shape of real API responses so route mocks stay consistent.
 */

// ─── Credentials ──────────────────────────────────────────────────────────────

/** Demo account credentials (no Supabase needed — sets Zustand store directly). */
export const DEMO_CREDENTIALS = {
  email: 'demo@vzexplorer.com',
  name: 'Tomas Demo',
} as const;

/**
 * Provider credentials read from env vars.
 * Set TEST_PROVIDER_EMAIL and TEST_PROVIDER_PASSWORD in .env.test or CI secrets.
 */
export const PROVIDER_CREDENTIALS = {
  email: process.env.TEST_PROVIDER_EMAIL || '',
  password: process.env.TEST_PROVIDER_PASSWORD || '',
} as const;

// ─── Listings ─────────────────────────────────────────────────────────────────

export const MOCK_LISTING_HOTEL = {
  id: 'listing-hotel-001',
  title: 'Casa Colonial Caracas',
  slug: 'casa-colonial-caracas',
  type: 'hotel',
  category: 'hotel',
  description: 'A charming colonial-style boutique hotel in the heart of Caracas.',
  short_description: 'Boutique hotel in Caracas historic centre.',
  region: 'caracas',
  city: 'Caracas',
  address: 'Calle 1, Caracas',
  price_usd: 75,
  price_ves: null,
  currency: 'USD',
  rating: 4.7,
  review_count: 38,
  total_reviews: 38,
  total_bookings: 96,
  max_guests: 2,
  min_guests: 1,
  safety_level: 'green',
  amenities: ['WiFi', 'Breakfast Included'],
  languages: ['es', 'en'],
  includes: ['Breakfast'],
  excludes: [],
  cancellation_policy: 'flexible',
  meeting_point: null,
  is_published: true,
  is_featured: true,
  cover_image_url: null,
  phone: null,
  website: null,
  latitude: 10.4806,
  longitude: -66.9036,
  platform_status: 'verified',
  provider: { business_name: 'Caracas Stays', is_verified: true, phone: null, whatsapp: null },
  photos: [],
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

export const MOCK_LISTING_EXPERIENCE = {
  id: 'listing-exp-001',
  title: 'Los Roques Snorkeling Tour',
  slug: 'los-roques-snorkeling-tour',
  type: 'experience',
  category: 'experience',
  description: 'Crystal-clear Caribbean waters, colourful reefs, and expert guides.',
  short_description: 'Snorkeling in Los Roques archipelago.',
  region: 'losroques',
  city: null,
  address: 'Los Roques Archipelago',
  price_usd: 120,
  price_ves: null,
  currency: 'USD',
  rating: 4.9,
  review_count: 56,
  total_reviews: 56,
  total_bookings: 112,
  max_guests: 12,
  min_guests: 2,
  safety_level: 'green',
  amenities: ['Guide Included', 'Equipment'],
  languages: ['es', 'en'],
  includes: ['Guide', 'Snorkel gear'],
  excludes: ['Food'],
  cancellation_policy: 'flexible',
  meeting_point: 'Gran Roque pier',
  is_published: true,
  is_featured: true,
  cover_image_url: null,
  phone: null,
  website: null,
  latitude: 11.9402,
  longitude: -66.7522,
  platform_status: 'verified',
  provider: { business_name: 'Los Roques Diving', is_verified: true, phone: null, whatsapp: null },
  photos: [],
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

export const MOCK_LISTINGS = [MOCK_LISTING_HOTEL, MOCK_LISTING_EXPERIENCE];

// ─── Itineraries ──────────────────────────────────────────────────────────────

export const MOCK_ITINERARY = {
  id: 'itinerary-test-001',
  title: 'My Venezuela Adventure',
  description: 'A curated 5-day trip through Venezuela.',
  user_id: 'demo-user-001',
  regions: ['caracas', 'losroques'],
  total_days: 5,
  estimated_cost_usd: 800,
  cover_image_url: null,
  start_date: '2026-06-01',
  end_date: '2026-06-05',
  is_public: true,
  is_template: false,
  is_influencer_pick: false,
  referral_code: null,
  tags: ['beach', 'adventure'],
  saves: 3,
  likes: 12,
  views: 240,
  stops: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const MOCK_PROVIDER = {
  id: 'provider-uuid-test',
  user_id: 'provider-user-001',
  business_name: 'Andes Adventures Test',
  description: 'Expert mountain guides for E2E testing',
  is_verified: true,
  is_approved: true,
  rating: 4.9,
  total_reviews: 48,
  region: 'Mérida',
};

// ─── Bookings ─────────────────────────────────────────────────────────────────

export const MOCK_BOOKING = {
  id: 'booking-test-001',
  listing_id: MOCK_LISTING_HOTEL.id,
  tourist_id: 'demo-user-001',
  check_in: '2026-06-10',
  check_out: '2026-06-13',
  guest_count: 2,
  total_usd: 225,
  status: 'confirmed',
  confirmation_code: 'VAV-TEST-001',
  payment_method: 'arrival',
  created_at: '2026-04-01T00:00:00Z',
};

// ─── Category slugs (must match LISTING_CATEGORIES in lib/constants) ──────────

export const VALID_CATEGORY_SLUGS = [
  'beaches',
  'mountains',
  'cities',
  'eco-tours',
  'gastronomy',
  'adventure',
  'wellness',
  'cultural',
] as const;

export type CategorySlug = typeof VALID_CATEGORY_SLUGS[number];

// ─── SmartStarter vibes (must match PlanningChatPanel / SmartStarters) ────────

export const SMART_STARTER_VIBES = [
  { label: 'Beach & Chill', prompt: 'beach and relaxation' },
  { label: 'Mountain Adventure', prompt: 'mountain adventure and hiking' },
  { label: 'Angel Falls', prompt: 'visiting Angel Falls and Canaima' },
  { label: 'Food & Culture', prompt: 'food, culture, and local experiences' },
  { label: 'City & Nightlife', prompt: 'city exploration and nightlife' },
  { label: 'Nature & Wildlife', prompt: 'nature, wildlife, and eco-tours' },
] as const;
