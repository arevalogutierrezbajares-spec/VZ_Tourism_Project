import type { ScrapedListing } from '@/lib/local-listings';
import type { Listing } from '@/types/database';

/**
 * Converts a ScrapedListing to a Listing-compatible shape for rendering in ListingCard.
 *
 * Scraped listings are missing many required Listing fields (price, safety_level,
 * max_guests, etc.). This adapter maps all known equivalents and provides safe
 * sentinel values for required non-nullable fields that have no scraped equivalent.
 * ListingCard null-guards every optional display field, so the sentinel values are
 * never shown to users.
 *
 * The `as Listing` cast at the end is the single, documented lie boundary —
 * better than scattering `as unknown as Listing[]` across page files.
 */
export function scrapedToListing(s: ScrapedListing): Listing {
  return {
    // ── Identity ──────────────────────────────────────────────────────────────
    id: s.id,
    slug: s.slug,
    provider_id: s.provider_id,

    // ── Display fields — mapped from ScrapedListing equivalents ──────────────
    title: s.name,
    description: s.description ?? '',
    short_description: s.description ? s.description.slice(0, 200) : '',
    cover_image_url: s.cover_image_url ?? null,
    location_name: s.city ?? s.address ?? '',
    address: s.address ?? null,
    region: s.region ?? '',
    latitude: s.latitude ?? 0,
    longitude: s.longitude ?? 0,
    google_place_id: s.google_place_id ?? null,

    // ── Ratings — ScrapedListing uses avg_rating (nullable) ───────────────────
    rating: s.avg_rating ?? 0,
    total_reviews: s.review_count ?? 0,

    // ── Fields with no scraped equivalent — safe sentinels ───────────────────
    // ListingCard null-guards these: `listing.price_usd != null`,
    // `listing.safety_level &&`, `listing.duration_hours &&`, etc.
    price_usd: null as unknown as number,
    price_ves: null,
    currency: 'USD',
    duration_hours: null,
    max_guests: null as unknown as number,
    min_guests: 1,
    is_published: true,
    is_featured: false,
    safety_level: null as unknown as Listing['safety_level'],
    category: null as unknown as Listing['category'],
    tags: s.category_tags ?? [],
    total_bookings: 0,
    amenities: [],
    languages: [],
    includes: [],
    excludes: [],
    cancellation_policy: '',
    meeting_point: null,

    // ── Timestamps ────────────────────────────────────────────────────────────
    created_at: s.created_at ?? '',
    updated_at: s.updated_at ?? '',

    // ── Source metadata ───────────────────────────────────────────────────────
    source: 'scraped',
  } as Listing;
}
