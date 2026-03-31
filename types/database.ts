export type UserRole = 'tourist' | 'provider' | 'admin' | 'creator';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded';

export type ListingCategory =
  | 'beaches'
  | 'mountains'
  | 'cities'
  | 'eco-tours'
  | 'gastronomy'
  | 'adventure'
  | 'wellness'
  | 'cultural';

export type SafetyLevel = 'green' | 'yellow' | 'orange' | 'red';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  phone: string | null;
  nationality: string | null;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}

export interface Provider {
  id: string;
  user_id: string;
  business_name: string;
  description: string;
  logo_url: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  whatsapp_number: string | null;
  rif: string | null;
  is_verified: boolean;
  is_approved: boolean;
  stripe_account_id: string | null;
  commission_rate: number;
  rating: number;
  total_reviews: number;
  region: string;
  created_at: string;
  updated_at: string;
}

export interface Listing {
  id: string;
  provider_id: string;
  title: string;
  slug: string;
  description: string;
  short_description: string;
  category: ListingCategory;
  tags: string[];
  region: string;
  location_name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  price_usd: number;
  price_ves: number | null;
  currency: 'USD' | 'VES';
  duration_hours: number | null;
  max_guests: number;
  min_guests: number;
  is_published: boolean;
  is_featured: boolean;
  safety_level: SafetyLevel;
  rating: number;
  total_reviews: number;
  total_bookings: number;
  amenities: string[];
  languages: string[];
  includes: string[];
  excludes: string[];
  cancellation_policy: string;
  meeting_point: string | null;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
  provider?: Provider;
  photos?: ListingPhoto[];
}

export interface ListingPhoto {
  id: string;
  listing_id: string;
  url: string;
  alt: string | null;
  order: number;
  created_at: string;
}

export interface Booking {
  id: string;
  listing_id: string;
  tourist_id: string;
  provider_id: string;
  status: BookingStatus;
  check_in: string;
  check_out: string | null;
  guests: number;
  total_usd: number;
  platform_fee_usd: number;
  provider_amount_usd: number;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  notes: string | null;
  special_requests: string | null;
  cancellation_reason: string | null;
  refund_amount_usd: number | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  listing?: Listing;
  tourist?: User;
  provider?: Provider;
}

export interface Review {
  id: string;
  listing_id: string;
  booking_id: string;
  tourist_id: string;
  rating: number;
  title: string | null;
  body: string;
  photos: string[];
  is_approved: boolean;
  provider_response: string | null;
  created_at: string;
  updated_at: string;
  tourist?: User;
}

export interface Itinerary {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  start_date: string | null;
  end_date: string | null;
  is_public: boolean;
  is_template: boolean;
  total_days: number;
  estimated_cost_usd: number;
  regions: string[];
  tags: string[];
  likes: number;
  saves: number;
  views: number;
  created_at: string;
  updated_at: string;
  stops?: ItineraryStop[];
  user?: User;
}

export interface ItineraryStop {
  id: string;
  itinerary_id: string;
  listing_id: string | null;
  day: number;
  order: number;
  title: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_hours: number | null;
  cost_usd: number;
  transport_to_next: string | null;
  transport_duration_minutes: number | null;
  notes: string | null;
  created_at: string;
  listing?: Listing;
}

export interface Guide {
  id: string;
  user_id: string;
  provider_id: string | null;
  full_name: string;
  bio: string;
  avatar_url: string | null;
  languages: string[];
  specialties: ListingCategory[];
  regions: string[];
  years_experience: number;
  is_certified: boolean;
  rating: number;
  total_reviews: number;
  hourly_rate_usd: number;
  created_at: string;
  updated_at: string;
}

export interface SafetyZone {
  id: string;
  name: string;
  description: string;
  level: SafetyLevel;
  region: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  tips: string[];
  emergency_contacts: EmergencyContact[];
  last_updated: string;
  created_at: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  type: 'police' | 'hospital' | 'embassy' | 'tourist_police' | 'fire';
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export type NotificationType =
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_completed'
  | 'payment_received'
  | 'review_received'
  | 'new_message'
  | 'safety_alert'
  | 'promotion';

export interface IGMention {
  id: string;
  provider_id: string;
  listing_id: string | null;
  instagram_post_url: string;
  media_url: string | null;
  caption: string | null;
  author_username: string;
  author_name: string | null;
  likes: number;
  is_approved: boolean;
  created_at: string;
}

export interface Availability {
  id: string;
  listing_id: string;
  date: string;
  slots: number;
  booked_slots: number;
  is_available: boolean;
  price_override_usd: number | null;
  created_at: string;
}

export interface CreatorProfile {
  id: string;
  user_id: string;
  username: string;
  bio: string;
  avatar_url: string | null;
  cover_image_url: string | null;
  instagram_handle: string | null;
  youtube_handle: string | null;
  tiktok_handle: string | null;
  website_url: string | null;
  followers: number;
  following: number;
  total_itineraries: number;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  user?: User;
}
