import type { ListingCategory, SafetyLevel } from '@/types/database';

export const LISTING_CATEGORIES: { value: ListingCategory; label: string; icon: string; description: string }[] = [
  { value: 'beaches', label: 'Beaches', icon: '🏖️', description: 'Caribbean beaches, islands, and coastal gems' },
  { value: 'mountains', label: 'Mountains', icon: '⛰️', description: 'Andes peaks, cloud forests, and highland adventures' },
  { value: 'cities', label: 'Cities', icon: '🏙️', description: 'Urban culture, architecture, and city experiences' },
  { value: 'eco-tours', label: 'Eco-Tours', icon: '🌿', description: 'Nature, wildlife, and sustainable tourism' },
  { value: 'gastronomy', label: 'Gastronomy', icon: '🍽️', description: 'Venezuelan cuisine, food tours, and culinary experiences' },
  { value: 'adventure', label: 'Adventure', icon: '🧗', description: 'Extreme sports, hiking, and adrenaline activities' },
  { value: 'wellness', label: 'Wellness', icon: '🧘', description: 'Spa, yoga, meditation, and relaxation' },
  { value: 'cultural', label: 'Cultural', icon: '🎭', description: 'History, art, music, and indigenous cultures' },
];

export const VENEZUELA_REGIONS = [
  {
    id: 'los-roques',
    name: 'Los Roques',
    description: 'Pristine Caribbean archipelago with crystal-clear waters',
    lat: 11.85,
    lng: -66.75,
    safetyLevel: 'green' as SafetyLevel,
    highlights: ['Snorkeling', 'Diving', 'Beaches', 'Fishing'],
  },
  {
    id: 'merida',
    name: 'Mérida',
    description: 'Andean city with dramatic mountain scenery and adventure sports',
    lat: 8.6,
    lng: -71.15,
    safetyLevel: 'green' as SafetyLevel,
    highlights: ['Cable Car', 'Trekking', 'Paragliding', 'Waterfalls'],
  },
  {
    id: 'margarita',
    name: 'Margarita Island',
    description: 'The Pearl of the Caribbean - beaches, shopping, seafood',
    lat: 11.0,
    lng: -64.0,
    safetyLevel: 'yellow' as SafetyLevel,
    highlights: ['Beaches', 'Kite Surfing', 'Seafood', 'Shopping'],
  },
  {
    id: 'canaima',
    name: 'Canaima',
    description: 'Home to Angel Falls, the world\'s highest waterfall',
    lat: 6.23,
    lng: -62.68,
    safetyLevel: 'green' as SafetyLevel,
    highlights: ['Angel Falls', 'Tepuis', 'Lagoons', 'Indigenous Culture'],
  },
  {
    id: 'gran-sabana',
    name: 'Gran Sabana',
    description: 'Vast savanna with ancient tepuis and unique biodiversity',
    lat: 5.16,
    lng: -61.12,
    safetyLevel: 'yellow' as SafetyLevel,
    highlights: ['Tepuis', 'Waterfalls', 'Wildlife', 'Camping'],
  },
  {
    id: 'morrocoy',
    name: 'Morrocoy',
    description: 'National park with mangroves, coral reefs, and white sand cays',
    lat: 10.87,
    lng: -68.22,
    safetyLevel: 'green' as SafetyLevel,
    highlights: ['Snorkeling', 'Beaches', 'Mangroves', 'Birdwatching'],
  },
  {
    id: 'barquisimeto',
    name: 'Barquisimeto',
    description: 'Musical capital of Venezuela with vibrant culture',
    lat: 10.07,
    lng: -69.32,
    safetyLevel: 'yellow' as SafetyLevel,
    highlights: ['Music', 'Gastronomy', 'Culture', 'Festivals'],
  },
  {
    id: 'caracas',
    name: 'Caracas',
    description: 'Dynamic capital with museums, restaurants, and urban experiences',
    lat: 10.48,
    lng: -66.88,
    safetyLevel: 'yellow' as SafetyLevel,
    highlights: ['Museums', 'Restaurants', 'Parks', 'Nightlife'],
  },
];

export const ACTIVITY_TAGS = [
  'snorkeling', 'diving', 'surfing', 'kite-surfing', 'fishing',
  'hiking', 'trekking', 'rock-climbing', 'paragliding', 'zip-lining',
  'birdwatching', 'wildlife', 'photography', 'camping',
  'food-tour', 'cooking-class', 'wine-tasting', 'coffee-tour',
  'yoga', 'meditation', 'spa', 'massage',
  'history', 'art', 'music', 'dance', 'festivals',
  'family-friendly', 'romantic', 'solo-travel', 'group-tour',
  'budget', 'luxury', 'eco-friendly', 'accessible',
];

export const SAFETY_LEVELS: { value: SafetyLevel; label: string; color: string; bgColor: string; description: string }[] = [
  {
    value: 'green',
    label: 'Safe',
    color: '#22C55E',
    bgColor: 'bg-green-100 text-green-800',
    description: 'Generally safe for all travelers. Normal precautions apply.',
  },
  {
    value: 'yellow',
    label: 'Caution',
    color: '#EAB308',
    bgColor: 'bg-yellow-100 text-yellow-800',
    description: 'Exercise normal precautions. Be aware of your surroundings.',
  },
  {
    value: 'orange',
    label: 'High Caution',
    color: '#F97316',
    bgColor: 'bg-orange-100 text-orange-800',
    description: 'Exercise increased caution. Research area before visiting.',
  },
  {
    value: 'red',
    label: 'Avoid',
    color: '#EF4444',
    bgColor: 'bg-red-100 text-red-800',
    description: 'Avoid travel if possible. High risk of crime or civil unrest.',
  },
];

export const BOOKING_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  { value: 'completed', label: 'Completed', color: 'bg-blue-100 text-blue-800' },
  { value: 'refunded', label: 'Refunded', color: 'bg-purple-100 text-purple-800' },
];

export const LANGUAGES = [
  { value: 'es', label: 'Spanish' },
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
];

export const AMENITIES = [
  'WiFi', 'Air Conditioning', 'Parking', 'Pool', 'Restaurant',
  'Bar', 'Room Service', 'Laundry', 'Gym', 'Spa',
  'Airport Transfer', 'Tour Desk', 'Currency Exchange',
  'Equipment Rental', 'Guide Included', 'Meals Included',
  'Photography', 'Video', 'Insurance', 'First Aid',
];

export const CANCELLATION_POLICIES = [
  {
    value: 'flexible',
    label: 'Flexible',
    description: 'Full refund up to 24 hours before experience start',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    description: 'Full refund up to 5 days before, 50% refund within 5 days',
  },
  {
    value: 'strict',
    label: 'Strict',
    description: 'Full refund up to 7 days before, no refund within 7 days',
  },
  {
    value: 'non-refundable',
    label: 'Non-refundable',
    description: 'No refunds available',
  },
];

export const PLATFORM_COMMISSION_RATE = 0.12; // 12% commission

export const MAX_UPLOAD_SIZE_MB = 10;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

export const VENEZUELA_CENTER: [number, number] = [-66.58, 8.0];
export const VENEZUELA_DEFAULT_ZOOM = 5.5;

export const AI_SEARCH_SUGGESTIONS = [
  'Beaches near Los Roques with snorkeling',
  'Adventure activities in Mérida',
  'Romantic getaway in Margarita Island',
  'Best waterfalls in Gran Sabana',
  'Food tour in Caracas',
  'Family-friendly eco-tour',
  'Budget diving in Morrocoy',
  'Hiking to Angel Falls',
  'Cultural experience in Barquisimeto',
  'Luxury wellness retreat',
];

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 100;
