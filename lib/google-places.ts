const API_KEY = process.env.GOOGLE_PLACES_API_KEY!;
const BASE_URL = 'https://places.googleapis.com/v1';

export interface PlaceAutocompleteResult {
  place_id: string;
  name: string;
  formatted_address: string;
  types: string[];
}

export interface PlaceDetails {
  id: string;
  displayName: { text: string; languageCode: string };
  formattedAddress: string;
  location: { latitude: number; longitude: number };
  types: string[];
  rating?: number;
  userRatingCount?: number;
  photos?: { name: string; widthPx: number; heightPx: number }[];
  googleMapsUri?: string;
  websiteUri?: string;
  internationalPhoneNumber?: string;
  primaryType?: string;
  editorialSummary?: { text: string; languageCode: string };
  addressComponents?: {
    longText: string;
    shortText: string;
    types: string[];
  }[];
}

/**
 * Search for places using Google Places Autocomplete (New).
 * Biased toward Venezuela results.
 */
export async function autocomplete(
  query: string,
  options?: { regionCode?: string; languageCode?: string }
): Promise<PlaceAutocompleteResult[]> {
  const response = await fetch(`${BASE_URL}/places:autocomplete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
    },
    body: JSON.stringify({
      input: query,
      includedRegionCodes: [options?.regionCode || 'VE'],
      languageCode: options?.languageCode || 'es',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Places Autocomplete failed: ${error}`);
  }

  const data = await response.json();
  const suggestions = data.suggestions || [];

  return suggestions
    .filter((s: Record<string, unknown>) => s.placePrediction)
    .map((s: Record<string, unknown>) => {
      const pred = s.placePrediction as Record<string, unknown>;
      const structured = pred.structuredFormat as Record<string, unknown> | undefined;
      const mainText = structured?.mainText as Record<string, string> | undefined;
      const secondaryText = structured?.secondaryText as Record<string, string> | undefined;
      const placeRef = pred.place as string | undefined;
      return {
        place_id: (pred.placeId || placeRef?.replace('places/', '') || '') as string,
        name: mainText?.text || (pred.text as Record<string, string>)?.text || '',
        formatted_address: secondaryText?.text || '',
        types: (pred.types as string[]) || [],
      };
    });
}

/**
 * Get full details for a place by its place ID.
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const fields = [
    'id',
    'displayName',
    'formattedAddress',
    'location',
    'types',
    'rating',
    'userRatingCount',
    'photos',
    'googleMapsUri',
    'websiteUri',
    'internationalPhoneNumber',
    'primaryType',
    'editorialSummary',
    'addressComponents',
  ].join(',');

  const response = await fetch(`${BASE_URL}/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': fields,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Places Details failed: ${error}`);
  }

  return response.json();
}

/**
 * Get a photo URL for a Google Places photo reference.
 */
export function getPhotoUrl(photoName: string, maxWidth = 800): string {
  return `/api/places/photo?ref=${encodeURIComponent(photoName)}&maxWidth=${maxWidth}`;
}

/**
 * Map Google Places types to our listing categories.
 */
export function mapPlaceTypeToCategory(types: string[]): string {
  const typeSet = new Set(types);

  if (typeSet.has('beach') || typeSet.has('natural_feature')) return 'beaches';
  if (typeSet.has('hiking_area') || typeSet.has('national_park') || typeSet.has('park'))
    return 'mountains';
  if (typeSet.has('restaurant') || typeSet.has('cafe') || typeSet.has('bakery') || typeSet.has('food'))
    return 'gastronomy';
  if (typeSet.has('museum') || typeSet.has('art_gallery') || typeSet.has('church') || typeSet.has('place_of_worship'))
    return 'cultural';
  if (typeSet.has('spa') || typeSet.has('gym') || typeSet.has('health'))
    return 'wellness';
  if (typeSet.has('amusement_park') || typeSet.has('tourist_attraction'))
    return 'adventure';
  if (typeSet.has('campground') || typeSet.has('rv_park'))
    return 'eco-tours';

  return 'adventure';
}

/**
 * Extract region from Google Places address components.
 */
export function extractRegion(
  addressComponents?: PlaceDetails['addressComponents']
): string {
  if (!addressComponents) return 'venezuela';

  const state = addressComponents.find((c) =>
    c.types.includes('administrative_area_level_1')
  );

  if (state) {
    return state.longText
      .toLowerCase()
      .replace(/\s+/g, '_')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  return 'venezuela';
}
