import type { DirectionsResult, GeocodingResult } from '@/types/map';

const BASE_URL = 'https://api.mapbox.com';

function getToken(): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    throw new Error(
      'NEXT_PUBLIC_MAPBOX_TOKEN is not configured. Set it in your environment variables.'
    );
  }
  return token;
}

export async function geocode(query: string, country = 'VE'): Promise<GeocodingResult[]> {
  const token = getToken();
  const encoded = encodeURIComponent(query);
  const url = `${BASE_URL}/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&country=${country}&limit=5`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Geocoding failed');

  const data = await response.json();

  return data.features.map((feature: {
    place_name: string;
    center: [number, number];
    place_type: string[];
    context?: { id: string; text: string }[];
  }) => ({
    place_name: feature.place_name,
    center: feature.center,
    place_type: feature.place_type,
    context: feature.context,
  }));
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeocodingResult | null> {
  const token = getToken();
  const url = `${BASE_URL}/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&limit=1`;

  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json();
  if (!data.features.length) return null;

  const feature = data.features[0];
  return {
    place_name: feature.place_name,
    center: feature.center,
    place_type: feature.place_type,
    context: feature.context,
  };
}

export async function getDirections(
  origin: [number, number],
  destination: [number, number],
  mode: 'driving' | 'walking' | 'cycling' = 'driving'
): Promise<DirectionsResult | null> {
  const token = getToken();
  const coords = `${origin[0]},${origin[1]};${destination[0]},${destination[1]}`;
  const profile = mode === 'cycling' ? 'cycling' : mode === 'walking' ? 'walking' : 'driving-traffic';
  const url = `${BASE_URL}/directions/v5/mapbox/${profile}/${coords}?access_token=${token}&geometries=geojson&steps=true&overview=full`;

  const response = await fetch(url);
  if (!response.ok) return null;

  return response.json();
}

/** Single source of truth for category → color mapping */
export const CATEGORY_COLORS: Record<string, string> = {
  accommodation: '#3B82F6',
  gastronomy:    '#F97316',
  adventure:     '#EF4444',
  beaches:       '#0EA5E9',
  'eco-tours':   '#22C55E',
  mountains:     '#8B5CF6',
  cultural:      '#F59E0B',
  wellness:      '#EC4899',
};

const DEFAULT_COLOR = '#6B7280';

/** Resolve category aliases to their canonical colors */
export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[normalizeCategory(category)] ?? DEFAULT_COLOR;
}

export const BUSINESS_CATEGORIES: { key: string; label: string; color: string }[] = [
  { key: 'accommodation', label: 'Hotels & Posadas', color: CATEGORY_COLORS.accommodation },
  { key: 'gastronomy', label: 'Gastronomy', color: CATEGORY_COLORS.gastronomy },
  { key: 'adventure', label: 'Adventure', color: CATEGORY_COLORS.adventure },
  { key: 'beaches', label: 'Beaches', color: CATEGORY_COLORS.beaches },
  { key: 'eco-tours', label: 'Eco-Tours', color: CATEGORY_COLORS['eco-tours'] },
  { key: 'mountains', label: 'Mountains', color: CATEGORY_COLORS.mountains },
  { key: 'cultural', label: 'Cultural', color: CATEGORY_COLORS.cultural },
  { key: 'wellness', label: 'Wellness', color: CATEGORY_COLORS.wellness },
];

/** Normalize raw API category aliases to canonical BUSINESS_CATEGORIES keys */
export function normalizeCategory(category: string | undefined): string {
  const cat = category ?? 'other';
  if (cat === 'restaurants') return 'gastronomy';
  if (cat === 'culture') return 'cultural';
  if (cat === 'cities') return 'accommodation';
  return cat;
}

export function getSafetyColor(level: string): string {
  const colors: Record<string, string> = {
    green: '#22C55E',
    yellow: '#EAB308',
    orange: '#F97316',
    red: '#EF4444',
  };
  return colors[level] || '#6B7280';
}

/** Build GeoJSON FeatureCollection from pins, filtering out hidden categories */
export function buildGeoJSON(
  pins: { id: string; lat: number; lng: number; title: string; slug?: string; category?: string; rating?: number; reviewCount?: number; city?: string; region?: string; listingId?: string; isVerified?: boolean }[],
  hiddenCategories: Set<string>,
) {
  return {
    type: 'FeatureCollection' as const,
    features: pins
      .filter((pin) => !hiddenCategories.has(normalizeCategory(pin.category)))
      .map((pin) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [pin.lng, pin.lat] },
        properties: {
          id: pin.id,
          title: pin.title,
          slug: pin.slug ?? '',
          category: pin.category ?? 'other',
          rating: pin.rating ?? null,
          reviewCount: pin.reviewCount ?? 0,
          city: pin.city ?? '',
          region: pin.region ?? '',
          listingId: pin.listingId ?? null,
          isVerified: pin.isVerified ? 1 : 0,
        },
      })),
  };
}

export function calculateBounds(
  coordinates: { lat: number; lng: number }[]
): { north: number; south: number; east: number; west: number } | null {
  if (!coordinates.length) return null;

  let north = -90,
    south = 90,
    east = -180,
    west = 180;

  for (const coord of coordinates) {
    if (coord.lat > north) north = coord.lat;
    if (coord.lat < south) south = coord.lat;
    if (coord.lng > east) east = coord.lng;
    if (coord.lng < west) west = coord.lng;
  }

  return { north, south, east, west };
}

