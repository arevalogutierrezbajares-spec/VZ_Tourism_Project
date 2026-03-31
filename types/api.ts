import type {
  Booking,
  BookingStatus,
  Itinerary,
  ItineraryStop,
  Listing,
  ListingCategory,
  Notification,
  Provider,
  Review,
  SafetyLevel,
  SafetyZone,
  User,
} from './database';

// Generic API response wrapper
export interface ApiResponse<T> {
  data: T;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  nationality?: string;
}

export interface ProviderRegisterRequest {
  email: string;
  password: string;
  full_name: string;
  business_name: string;
  description: string;
  region: string;
  phone?: string;
  rif?: string;
  instagram_handle?: string;
  website_url?: string;
}

export interface AuthResponse {
  user: User;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

// Listings
export interface ListingsQueryParams {
  category?: ListingCategory;
  region?: string;
  minPrice?: number;
  maxPrice?: number;
  safetyLevel?: SafetyLevel;
  tags?: string[];
  lat?: number;
  lng?: number;
  radius?: number;
  query?: string;
  page?: number;
  limit?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popular';
  featured?: boolean;
}

export interface CreateListingRequest {
  title: string;
  description: string;
  short_description: string;
  category: ListingCategory;
  tags: string[];
  region: string;
  location_name: string;
  latitude: number;
  longitude: number;
  address?: string;
  price_usd: number;
  duration_hours?: number;
  max_guests: number;
  min_guests: number;
  safety_level: SafetyLevel;
  amenities: string[];
  languages: string[];
  includes: string[];
  excludes: string[];
  cancellation_policy: string;
  meeting_point?: string;
}

export interface UpdateListingRequest extends Partial<CreateListingRequest> {
  is_published?: boolean;
  is_featured?: boolean;
}

// Bookings
export interface CreateBookingRequest {
  listing_id: string;
  check_in: string;
  check_out?: string;
  guests: number;
  notes?: string;
  special_requests?: string;
}

export interface UpdateBookingRequest {
  status?: BookingStatus;
  notes?: string;
  cancellation_reason?: string;
}

export interface BookingsQueryParams {
  status?: BookingStatus;
  listing_id?: string;
  tourist_id?: string;
  provider_id?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

// Reviews
export interface CreateReviewRequest {
  booking_id: string;
  listing_id: string;
  rating: number;
  title?: string;
  body: string;
  photos?: string[];
}

export interface ReviewsQueryParams {
  listing_id?: string;
  tourist_id?: string;
  minRating?: number;
  page?: number;
  limit?: number;
}

// Itineraries
export interface CreateItineraryRequest {
  title: string;
  description?: string;
  cover_image_url?: string;
  start_date?: string;
  end_date?: string;
  is_public?: boolean;
  is_template?: boolean;
  tags?: string[];
}

export interface UpdateItineraryRequest extends Partial<CreateItineraryRequest> {}

export interface AddStopRequest {
  listing_id?: string;
  day: number;
  order: number;
  title: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  start_time?: string;
  end_time?: string;
  duration_hours?: number;
  cost_usd?: number;
  transport_to_next?: string;
  transport_duration_minutes?: number;
  notes?: string;
}

// Providers
export interface CreateProviderRequest {
  business_name: string;
  description: string;
  region: string;
  logo_url?: string;
  website_url?: string;
  instagram_handle?: string;
  whatsapp_number?: string;
  rif?: string;
}

export interface UpdateProviderRequest extends Partial<CreateProviderRequest> {
  is_verified?: boolean;
}

export interface ProvidersQueryParams {
  region?: string;
  is_verified?: boolean;
  page?: number;
  limit?: number;
}

// Stripe
export interface CreateCheckoutSessionRequest {
  booking_id: string;
  success_url: string;
  cancel_url: string;
}

export interface CheckoutSessionResponse {
  checkout_url: string;
  session_id: string;
}

// AI Search
export interface AISearchRequest {
  query: string;
  conversationHistory?: AIMessage[];
  filters?: {
    category?: ListingCategory;
    region?: string;
    minPrice?: number;
    maxPrice?: number;
    safetyLevel?: SafetyLevel;
  };
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AISearchResult {
  text: string;
  listings: Listing[];
  safetyInfo?: SafetyZone[];
  suggestions: string[];
}

// Notifications
export interface CreateNotificationRequest {
  user_id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface NotificationsQueryParams {
  is_read?: boolean;
  page?: number;
  limit?: number;
}

// Safety Zones
export interface CreateSafetyZoneRequest {
  name: string;
  description: string;
  level: SafetyLevel;
  region: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  tips: string[];
  emergency_contacts: {
    name: string;
    phone: string;
    type: string;
  }[];
}

// Upload
export interface UploadRequest {
  file: File;
  bucket: 'listings' | 'avatars' | 'providers' | 'ig-mentions';
  path?: string;
}

export interface UploadResponse {
  url: string;
  path: string;
}

// Availability
export interface AvailabilitySlot {
  date: string;
  slots: number;
  booked_slots: number;
  is_available: boolean;
  price_override_usd: number | null;
}

export interface SetAvailabilityRequest {
  dates: {
    date: string;
    slots: number;
    is_available: boolean;
    price_override_usd?: number;
  }[];
}

// Analytics
export interface ProviderAnalytics {
  total_bookings: number;
  confirmed_bookings: number;
  cancelled_bookings: number;
  completed_bookings: number;
  total_revenue_usd: number;
  avg_booking_value: number;
  total_reviews: number;
  avg_rating: number;
  top_listings: { listing_id: string; title: string; bookings: number; revenue: number }[];
  revenue_by_month: { month: string; revenue: number; bookings: number }[];
  guest_nationalities: { nationality: string; count: number }[];
}
