import fs from 'fs';
import path from 'path';

export type PlatformStatus = 'scraped' | 'outreach_sent' | 'interested' | 'onboarding' | 'verified' | 'founding_partner';

export interface ScrapedListing {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string;
  latitude: number;
  longitude: number;
  region: string;
  city?: string;
  avg_rating: number | null;
  review_count: number;
  phone: string | null;
  website: string | null;
  instagram_handle: string | null;
  google_place_id: string | null;
  cover_image_url: string | null;
  category_tags: string[];
  address: string;
  provider_id: string;
  status: string;
  platform_status: PlatformStatus;
  created_at: string | null;
  updated_at: string | null;
}

export function isOnboarded(listing: ScrapedListing): boolean {
  return listing.platform_status === 'verified' || listing.platform_status === 'founding_partner';
}

let _cache: ScrapedListing[] | null = null;

export function invalidateCache(): void {
  _cache = null;
}

function loadListings(): ScrapedListing[] {
  if (_cache) return _cache;
  const filePath = path.join(process.cwd(), 'data', 'scraped-listings.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  _cache = JSON.parse(raw) as ScrapedListing[];
  return _cache;
}

// Internal category -> type mapping
const CATEGORY_TYPES: Record<string, string[]> = {
  stays: ['hotel', 'posada', 'hospedaje', 'alojamiento', 'casa vacacional', 'hostal'],
  dining: ['restaurante', 'restaurant', 'cafe', 'bar'],
  experiences: ['tours', 'tour', 'experience', 'agencia'],
  transportation: ['transfer'],
  // legacy aliases
  hotel: ['hotel', 'posada', 'hospedaje', 'alojamiento', 'casa vacacional', 'hostal'],
  restaurant: ['restaurante', 'restaurant', 'cafe', 'bar'],
  experience: ['tours', 'tour', 'transfer', 'experience', 'agencia'],
};

// Map scraped business types to display category
export function mapTypeToCategory(type: string): 'stays' | 'dining' | 'experiences' | 'transportation' | 'other' {
  const t = (type || '').toLowerCase();
  if (CATEGORY_TYPES.stays.includes(t)) return 'stays';
  if (CATEGORY_TYPES.dining.includes(t)) return 'dining';
  if (t === 'transfer') return 'transportation';
  if (CATEGORY_TYPES.experiences.includes(t)) return 'experiences';
  return 'other';
}

export type SortOption = 'relevance' | 'rating' | 'reviews' | 'name';

export interface SearchFilters {
  region?: string;
  type?: string;
  category?: string;
  platform_status?: PlatformStatus;
  sort?: SortOption;
  limit?: number;
  offset?: number;
}

function applyFilters(
  listings: ScrapedListing[],
  query: string,
  filters?: SearchFilters
): ScrapedListing[] {
  let results = listings;

  if (query) {
    const q = query.toLowerCase();
    results = results.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.region?.toLowerCase().includes(q) ||
        l.type?.toLowerCase().includes(q) ||
        l.address?.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q)
    );
  }

  if (filters?.region) {
    results = results.filter((l) => l.region === filters.region);
  }
  if (filters?.type) {
    results = results.filter((l) => l.type === filters.type);
  }
  if (filters?.category) {
    const types = CATEGORY_TYPES[filters.category];
    if (types) {
      results = results.filter((l) => types.includes((l.type || '').toLowerCase()));
    } else if (filters.category === 'other') {
      const allKnown = Object.values(CATEGORY_TYPES).flat();
      results = results.filter((l) => !allKnown.includes((l.type || '').toLowerCase()));
    }
  }
  if (filters?.platform_status) {
    results = results.filter((l) => (l.platform_status || 'scraped') === filters.platform_status);
  }

  return results;
}

function applySort(results: ScrapedListing[], sort?: SortOption): ScrapedListing[] {
  const s = sort || 'relevance';
  if (s === 'rating') {
    return [...results].sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
  }
  if (s === 'reviews') {
    return [...results].sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
  }
  if (s === 'name') {
    return [...results].sort((a, b) => a.name.localeCompare(b.name));
  }
  // relevance: rating * review_count
  return [...results].sort(
    (a, b) =>
      (b.avg_rating || 0) * (b.review_count || 0) -
      (a.avg_rating || 0) * (a.review_count || 0)
  );
}

export function searchListings(query: string, filters?: SearchFilters): ScrapedListing[] {
  const all = loadListings();
  const filtered = applyFilters(all, query, filters);
  const sorted = applySort(filtered, filters?.sort);
  const offset = filters?.offset || 0;
  const limit = filters?.limit || 20;
  return sorted.slice(offset, offset + limit);
}

export function countListings(query: string, filters?: Omit<SearchFilters, 'limit' | 'offset' | 'sort'>): number {
  const all = loadListings();
  return applyFilters(all, query, filters).length;
}

export function getListingBySlug(slug: string): ScrapedListing | undefined {
  return loadListings().find((l) => l.slug === slug);
}

export function getAllListings(): ScrapedListing[] {
  return loadListings();
}

export function getListingsByRegion(region: string): ScrapedListing[] {
  return loadListings().filter((l) => l.region === region);
}

export function getCategoryCounts(): Record<string, number> {
  const listings = loadListings();
  const counts: Record<string, number> = { stays: 0, dining: 0, experiences: 0, transportation: 0 };
  for (const l of listings) {
    const cat = mapTypeToCategory(l.type);
    if (cat === 'stays') counts.stays++;
    else if (cat === 'dining') counts.dining++;
    else if (cat === 'experiences') counts.experiences++;
    else if (cat === 'transportation') counts.transportation++;
  }
  return counts;
}

export function getRegionCounts(): Record<string, number> {
  const listings = loadListings();
  const counts: Record<string, number> = {};
  for (const l of listings) {
    const r = l.region || 'unknown';
    counts[r] = (counts[r] || 0) + 1;
  }
  return counts;
}

// Legacy compat
export function getTotalCount(
  query?: string,
  filters?: { region?: string; type?: string }
): number {
  return countListings(query || '', filters);
}
