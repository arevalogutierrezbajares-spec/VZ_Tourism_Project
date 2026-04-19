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

export type ListingSource = 'manual' | 'creator_import' | 'scraped' | 'admin' | 'google_places';

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
  google_place_id?: string | null;
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
  source?: ListingSource;
  added_by_user_id?: string | null;
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

export type ItineraryCreationMethod = 'social_import' | 'document_import' | 'conversation' | 'scratch' | 'clone';

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
  is_influencer_pick: boolean;
  referral_code: string | null;
  total_days: number;
  estimated_cost_usd: number;
  regions: string[];
  tags: string[];
  likes: number;
  saves: number;
  views: number;
  creation_method?: ItineraryCreationMethod;
  created_at: string;
  updated_at: string;
  stops?: ItineraryStop[];
  user?: User;
}

export interface ItineraryReferral {
  id: string;
  itinerary_id: string;
  creator_id: string;
  referral_code: string;
  ip_hash: string;
  booking_id: string | null;
  clicked_at: string;
  converted_at: string | null;
  commission_rate: number;
  commission_amount_usd: number | null;
}

export type StopSourceType = 'social_import' | 'document_import' | 'ai_suggested' | 'manual' | 'google_places';

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
  source_url?: string | null;
  source_type?: StopSourceType;
  video_embed_url?: string | null;
  created_at: string;
  listing?: Listing;
}

// itinerary_conversations table exists in DB (migration 009) for future use.
// The current conversation route uses stateless SSE streaming.
// These types are defined here for when conversation persistence is implemented.
export interface ItineraryConversation {
  id: string;
  itinerary_id: string | null;
  user_id: string;
  messages: ConversationMessage[];
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
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

// ─── Posada Knowledge Base ───────────────────────────────────────────────────

export interface RoomType {
  name: string;
  capacity: number;
  price_usd: number;
  description: string;
  amenities: string[];
}

export interface PosadaPolicies {
  check_in?: string;          // e.g. "3:00 PM"
  check_out?: string;         // e.g. "11:00 AM"
  min_stay_nights?: number;
  cancellation?: string;
  deposit_percent?: number;
  pets?: string;              // "allowed" | "not allowed" | "on request"
  smoking?: string;
  extra_guest_fee?: string;
}

export interface FaqPair {
  question: string;
  answer: string;
}

export interface PricingSeasonalPeriod {
  name: string;          // e.g. "Semana Santa", "Navidad"
  dates: { start: string; end: string }[]; // YYYY-MM-DD pairs
  multiplier: number;    // e.g. 1.3 = 30% increase
}

export interface PricingLongStayDiscount {
  nights: number;        // minimum nights
  discount: number;      // e.g. 0.1 = 10% off
}

export interface PricingRules {
  seasonal_periods?: PricingSeasonalPeriod[];
  weekend_premium?: number;           // e.g. 0.2 = +20% on Fri/Sat
  long_stay_discounts?: PricingLongStayDiscount[];
  last_minute_discount?: {
    days_before: number;              // e.g. 3 = within 3 days of arrival
    discount: number;                 // e.g. 0.15 = 15% off
  };
  quote_currency?: 'USD' | 'Bs' | 'both';
}

export interface PosadaKnowledge {
  id: string;
  provider_id: string;
  property_description: string | null;
  location_details: string | null;
  room_types: RoomType[];
  amenities: string[];
  policies: PosadaPolicies;
  faqs: FaqPair[];
  booking_process: string | null;
  payment_methods: string[];
  nearby_attractions: string | null;
  languages_spoken: string[];
  special_notes: string | null;
  pricing_rules: PricingRules;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────

// ─── WhatsApp AI Messaging ────────────────────────────────────────────────────

export type WaConversationStatus = 'ai' | 'human' | 'escalated' | 'closed';
export type WaBookingStage = 'lead' | 'quoted' | 'confirmed' | 'checked_in' | 'closed';
export type WaMessageRole = 'inbound' | 'outbound';
export type WaToneFormality = 'casual' | 'neutral' | 'formal';
export type WaToneLanguage = 'es' | 'en' | 'bilingual';
export type WaResponseLength = 'brief' | 'standard' | 'detailed';
export type WaBookingPressure = 'soft' | 'direct';
export type WaEscalationTrigger = 'manual' | 'sentiment' | 'bot_question' | 'keyword' | 'value_threshold' | 'ai_uncertainty';

export type WaEmojiStyle = 'frequent' | 'moderate' | 'none';
export type WaGreetingStyle = 'friendly' | 'professional' | 'custom';

export interface WaWorkingHoursDay {
  active: boolean;
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

export interface WaWorkingHours {
  mon: WaWorkingHoursDay;
  tue: WaWorkingHoursDay;
  wed: WaWorkingHoursDay;
  thu: WaWorkingHoursDay;
  fri: WaWorkingHoursDay;
  sat: WaWorkingHoursDay;
  sun: WaWorkingHoursDay;
}

export interface PosadaWhatsappConfig {
  id: string;
  provider_id: string;
  phone_number_id: string;
  access_token: string;
  verify_token: string;
  // Persona
  persona_name: string;
  persona_bio: string | null;
  greeting_style: WaGreetingStyle;
  custom_greeting: string | null;
  // Tone & communication
  tone_formality: WaToneFormality;
  tone_language: WaToneLanguage;
  response_length: WaResponseLength;
  booking_pressure: WaBookingPressure;
  emoji_style: WaEmojiStyle;
  // Smart rules
  upsell_enabled: boolean;
  sentiment_threshold: number;
  value_escalation_usd: number;
  escalation_keywords: string[];
  // Humanisation
  response_delay_ms: number;
  // Availability
  working_hours_enabled: boolean;
  working_hours: WaWorkingHours | null;
  after_hours_message: string | null;
  // Custom prompt
  custom_instructions: string | null;
  // Master switch
  ai_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface WaConversation {
  id: string;
  provider_id: string;
  guest_phone: string;
  guest_name: string | null;
  status: WaConversationStatus;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  booking_stage: WaBookingStage;
  notes: string | null;
  guest_language: string | null;  // BCP-47 primary language detected
  created_at: string;
  updated_at: string;
  messages?: WaMessage[];
  escalations?: WaEscalation[];
}

export interface WaMessage {
  id: string;
  conversation_id: string;
  wa_message_id: string | null;
  role: WaMessageRole;
  content: string;
  content_en: string | null;      // English translation (null if already English)
  detected_lang: string | null;   // BCP-47 language code
  is_ai: boolean;
  flagged: boolean;
  flag_reason: string | null;
  sentiment_score: number | null;
  created_at: string;
}

export interface WaEscalation {
  id: string;
  conversation_id: string;
  reason: string;
  trigger_type: WaEscalationTrigger | null;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────

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
