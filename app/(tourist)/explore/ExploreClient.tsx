'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { MapPin, Search, ChevronDown, Heart, PlusCircle, CheckCircle, LayoutGrid, Map, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFavoritesStore } from '@/stores/favorites-store';
import { useItineraryStore } from '@/stores/itinerary-store';
import { useMapStore } from '@/stores/map-store';
import type { MapPin as MapPinType } from '@/types/map';

const MapContainer = dynamic(
  () => import('@/components/map/MapContainer').then((m) => m.MapContainer),
  { ssr: false }
);

interface ApiListing {
  id: string;
  title: string;
  slug: string;
  type: string;
  category: string;
  description: string;
  region: string;
  city: string | null;
  address: string;
  rating: number | null;
  review_count: number;
  phone: string | null;
  website: string | null;
  cover_image_url: string | null;
  platform_status?: string;
  latitude?: number | null;
  longitude?: number | null;
}

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '🌎' },
  { id: 'hotel', label: 'Hotels', icon: '🏨' },
  { id: 'restaurant', label: 'Restaurants', icon: '🍽️' },
  { id: 'experience', label: 'Experiences', icon: '🎒' },
] as const;

const REGIONS: { id: string; label: string }[] = [
  { id: 'all', label: 'All regions' },
  { id: 'caracas', label: 'Caracas' },
  { id: 'losroques', label: 'Los Roques' },
  { id: 'merida', label: 'Mérida' },
  { id: 'margarita', label: 'Margarita' },
  { id: 'morrocoy', label: 'Morrocoy' },
  { id: 'canaima', label: 'Canaima' },
  { id: 'choroni', label: 'Choroní' },
  { id: 'falcon', label: 'Falcón' },
  { id: 'venezuela', label: 'Other' },
];

const REGION_LABELS: Record<string, string> = {
  caracas: 'Caracas',
  losroques: 'Los Roques',
  merida: 'Mérida',
  margarita: 'Isla Margarita',
  morrocoy: 'Morrocoy',
  canaima: 'Canaima',
  choroni: 'Choroní',
  falcon: 'Falcón',
  venezuela: 'Venezuela',
};

// Fallback coordinates per region (lng, lat) for listings without GPS data
const REGION_COORDS: Record<string, [number, number]> = {
  caracas:   [-66.9036, 10.4806],
  losroques: [-66.7522, 11.9402],
  merida:    [-71.1443,  8.5897],
  margarita: [-63.9587, 10.9731],
  morrocoy:  [-68.2163, 10.8604],
  canaima:   [-62.8547,  6.2372],
  choroni:   [-67.6214, 10.4987],
  falcon:    [-68.9913, 11.4480],
  venezuela: [-66.5897,  8.0000],
};

const SORT_OPTIONS = [
  { id: 'default', label: 'Recommended' },
  { id: 'rating', label: 'Highest rated' },
  { id: 'reviews', label: 'Most reviewed' },
  { id: 'price_asc', label: 'Price: low to high' },
  { id: 'price_desc', label: 'Price: high to low' },
] as const;

type SortOption = typeof SORT_OPTIONS[number]['id'];

const PAGE_SIZE = 24;

const CATEGORY_GRADIENTS: Record<string, string> = {
  hotel: 'from-blue-400 to-blue-600',
  restaurant: 'from-orange-400 to-orange-600',
  experience: 'from-emerald-400 to-emerald-600',
  other: 'from-purple-400 to-purple-600',
};

const CATEGORY_ICONS: Record<string, string> = {
  hotel: '🏨',
  restaurant: '🍽️',
  experience: '🎒',
  posada: '🏡',
  tours: '🎒',
  other: '📍',
};

const TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  posada: 'Posada',
  hostal: 'Hostal',
  hospedaje: 'Hospedaje',
  alojamiento: 'Alojamiento',
  'casa vacacional': 'Casa',
  restaurante: 'Restaurant',
  restaurant: 'Restaurant',
  cafe: 'Café',
  bar: 'Bar',
  tours: 'Tour',
  tour: 'Tour',
  transfer: 'Transfer',
  experience: 'Experience',
  agencia: 'Agency',
};

interface Tag {
  label: string;
  icon: string;
  color: string;
}

function generateTags(listing: ApiListing): Tag[] {
  const tags: Tag[] = [];
  const region = listing.region?.toLowerCase() ?? '';
  const type = listing.type?.toLowerCase() ?? '';
  const category = listing.category?.toLowerCase() ?? '';
  const rating = listing.rating ?? 0;
  const reviews = listing.review_count ?? 0;
  const name = listing.title?.toLowerCase() ?? '';

  // Location tags — wired to real listing attributes
  if (['losroques', 'morrocoy', 'choroni', 'margarita'].includes(region)) {
    tags.push({ label: 'Beachfront', icon: '🏖️', color: 'bg-cyan-50 text-cyan-700' });
  }
  if (['merida', 'canaima'].includes(region)) {
    tags.push({ label: 'Mountain', icon: '⛰️', color: 'bg-emerald-50 text-emerald-700' });
  }
  if (region === 'losroques' || region === 'margarita') {
    tags.push({ label: 'Island', icon: '🏝️', color: 'bg-blue-50 text-blue-700' });
  }
  if (region === 'caracas') {
    tags.push({ label: 'City Center', icon: '🏙️', color: 'bg-slate-50 text-slate-700' });
  }

  // Activity tags — wired to category + region
  if (region === 'losroques' || (category === 'experience' && region === 'margarita')) {
    tags.push({ label: 'Diving', icon: '🤿', color: 'bg-teal-50 text-teal-700' });
  }
  if (['merida', 'canaima'].includes(region) || category === 'adventure' || name.includes('hik') || name.includes('trek')) {
    tags.push({ label: 'Hiking', icon: '🥾', color: 'bg-green-50 text-green-700' });
  }
  if (region === 'canaima' || name.includes('nature') || name.includes('wildlife')) {
    tags.push({ label: 'Nature', icon: '🌿', color: 'bg-lime-50 text-lime-700' });
  }

  // Type-specific tags — wired to real listing.type
  if (type === 'posada' || type === 'casa vacacional') {
    tags.push({ label: 'Boutique Stay', icon: '🏡', color: 'bg-orange-50 text-orange-700' });
  }
  if (type === 'tours' || type === 'tour' || category === 'experience') {
    tags.push({ label: 'Guided Tour', icon: '🎒', color: 'bg-violet-50 text-violet-700' });
  }
  if (name.includes('spa') || name.includes('wellness') || category === 'wellness') {
    tags.push({ label: 'Spa & Wellness', icon: '💆', color: 'bg-pink-50 text-pink-700' });
  }
  if (name.includes('eco') || name.includes('natural') || name.includes('reserva')) {
    tags.push({ label: 'Eco-Friendly', icon: '🌱', color: 'bg-green-50 text-green-700' });
  }

  // Quality tags — wired to real rating + review_count
  if (rating >= 4.5) {
    tags.push({ label: 'Top Rated', icon: '🏆', color: 'bg-amber-50 text-amber-700' });
  }
  if (reviews >= 500) {
    tags.push({ label: 'Popular', icon: '🔥', color: 'bg-rose-50 text-rose-700' });
  }
  if (reviews >= 50 && reviews < 500 && rating >= 4.0) {
    tags.push({ label: 'Local Favorite', icon: '❤️', color: 'bg-rose-50 text-rose-700' });
  }
  if (rating >= 4.0 && reviews < 50) {
    tags.push({ label: 'Hidden Gem', icon: '💎', color: 'bg-purple-50 text-purple-700' });
  }

  return tags.slice(0, 4);
}

function estimateListingPrice(listing: ApiListing): number {
  const type = listing.type?.toLowerCase() ?? '';
  const rating = listing.rating ?? 0;
  if (type === 'restaurante' || type === 'restaurant' || type === 'cafe' || type === 'bar') {
    return rating >= 4.5 ? 35 : rating >= 4 ? 27 : 18;
  }
  if (type === 'posada' || type === 'alojamiento' || type === 'hospedaje' || type === 'casa vacacional') {
    return rating >= 4.5 ? 75 : rating >= 4 ? 60 : 40;
  }
  if (type === 'hotel') {
    return rating >= 4.5 ? 185 : rating >= 4 ? 110 : rating >= 3 ? 80 : 60;
  }
  if (type === 'tours' || type === 'tour' || type === 'experience') {
    return rating >= 4.5 ? 45 : 30;
  }
  return 60;
}

function listingToPin(listing: ApiListing): MapPinType {
  const fallback = REGION_COORDS[listing.region?.toLowerCase() ?? ''] ?? REGION_COORDS.venezuela;
  // Small deterministic jitter to spread co-located fallback pins
  const seed = listing.id.charCodeAt(0) / 255;
  const lat = listing.latitude ?? fallback[1] + (seed - 0.5) * 0.04;
  const lng = listing.longitude ?? fallback[0] + (seed - 0.5) * 0.04;
  return {
    id: listing.id,
    lat,
    lng,
    title: listing.title,
    category: listing.category ?? 'other',
    rating: listing.rating ?? undefined,
    reviewCount: listing.review_count,
    region: listing.region ?? undefined,
    city: listing.city ?? undefined,
    isVerified:
      listing.platform_status === 'verified' ||
      listing.platform_status === 'founding_partner',
    listingId: listing.id,
  };
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: full }).map((_, i) => (
          <span key={`f${i}`} className="text-amber-400 text-sm leading-none">★</span>
        ))}
        {half && <span className="text-amber-400 text-sm leading-none">★</span>}
        {Array.from({ length: empty }).map((_, i) => (
          <span key={`e${i}`} className="text-gray-200 text-sm leading-none">★</span>
        ))}
      </div>
      <span className="text-sm font-semibold text-gray-800">{rating.toFixed(1)}</span>
    </div>
  );
}

function PriceDisplay({ listing }: { listing: ApiListing }) {
  const estimate = estimateListingPrice(listing);
  const type = listing.type?.toLowerCase() ?? '';
  const isFood = type === 'restaurante' || type === 'restaurant' || type === 'cafe' || type === 'bar';
  const isTour = type === 'tours' || type === 'tour' || type === 'experience';
  const suffix = isFood ? '/person' : isTour ? '/person' : '/night';
  return (
    <span className="text-sm font-medium text-gray-700">
      ~${estimate}
      <span className="text-gray-400 font-normal text-xs ml-0.5">{suffix}</span>
    </span>
  );
}

function TierBadge({ status }: { status?: string }) {
  if (status === 'founding_partner') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
        🏆 Founding Partner
      </span>
    );
  }
  if (status === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
        ✅ Verified Partner
      </span>
    );
  }
  return null;
}

function ListingCard({ listing }: { listing: ApiListing }) {
  const { favorites, addFavorite, removeFavorite } = useFavoritesStore();
  const { current: activeItinerary, days, addStop, openPanel } = useItineraryStore();
  const [addedToTrip, setAddedToTrip] = useState(false);
  const isFavorited = favorites.includes(listing.id);
  const alreadyInTrip = days.some((d) => d.stops.some((s) => s.listing_id === listing.id));

  const handleAddToTrip = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const targetDay = days.length > 0 ? days[days.length - 1].day : 1;
    const stopCount = days.length > 0 ? days[days.length - 1].stops.length : 0;
    addStop({
      itinerary_id: activeItinerary?.id ?? '',
      day: targetDay,
      order: stopCount + 1,
      listing_id: listing.id,
      title: listing.title,
      description: null,
      latitude: null,
      longitude: null,
      location_name: listing.region ?? null,
      start_time: null,
      end_time: null,
      duration_hours: null,
      cost_usd: 0,
      transport_to_next: null,
      transport_duration_minutes: null,
      notes: null,
    });
    openPanel();
    setAddedToTrip(true);
    setTimeout(() => setAddedToTrip(false), 2500);
  };
  const gradient = CATEGORY_GRADIENTS[listing.category] ?? CATEGORY_GRADIENTS.other;
  const catIcon = CATEGORY_ICONS[listing.type?.toLowerCase()] ?? CATEGORY_ICONS[listing.category] ?? '📍';
  const typeLabel = TYPE_LABELS[listing.type?.toLowerCase()] ?? listing.type ?? 'Place';
  const regionLabel = REGION_LABELS[listing.region?.toLowerCase()] ?? listing.region ?? 'Venezuela';
  const tags = generateTags(listing);
  const isOnboarded = listing.platform_status === 'verified' || listing.platform_status === 'founding_partner';
  const borderAccent = listing.platform_status === 'founding_partner'
    ? 'border-l-4 border-l-amber-400'
    : listing.platform_status === 'verified'
    ? 'border-l-4 border-l-emerald-400'
    : '';

  return (
    <Link href={`/listing/${listing.slug}`} className="group block">
      <div className={cn('bg-white rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 overflow-hidden', borderAccent)}>
        {/* Photo area — 16:10 */}
        <div className="relative w-full" style={{ paddingBottom: '62.5%' }}>
          <div className="absolute inset-0">
            {listing.cover_image_url ? (
              <img
                src={listing.cover_image_url}
                alt={listing.title}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={cn('w-full h-full bg-gradient-to-br flex flex-col items-center justify-center', gradient)}>
                <span className="text-5xl mb-2 drop-shadow">{catIcon}</span>
                <span className="text-white/70 text-sm font-medium uppercase tracking-wider">{typeLabel}</span>
              </div>
            )}

            {/* Category badge — top left */}
            <div className="absolute top-3 left-3">
              <span className="bg-black/40 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
                {typeLabel}
              </span>
            </div>

            {/* Heart — top right */}
            <button
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow hover:bg-white transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isFavorited) removeFavorite(listing.id);
                else addFavorite(listing.id);
              }}
              aria-label={isFavorited ? 'Remove from saved' : 'Save'}
            >
              <Heart
                className={cn(
                  'w-4 h-4 transition-colors',
                  isFavorited ? 'fill-rose-500 text-rose-500' : 'text-gray-500 hover:text-rose-500'
                )}
              />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="p-4 space-y-2.5">
          {/* Tier badge */}
          <TierBadge status={listing.platform_status} />

          {/* Stars + rating */}
          {listing.rating !== null && (
            <StarRating rating={listing.rating} />
          )}

          {/* Name */}
          <h3 className="font-bold text-base text-gray-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
            {listing.title}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
            <span>{regionLabel}</span>
          </div>

          {/* Smart tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag.label}
                  className={cn('inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium', tag.color)}
                >
                  <span>{tag.icon}</span>
                  {tag.label}
                </span>
              ))}
            </div>
          )}

          {/* Bottom row: price + review count + CTA */}
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-2">
              <PriceDisplay listing={listing} />
              {listing.review_count > 0 && (
                <>
                  <span className="text-gray-300 text-xs">·</span>
                  <span className="text-xs text-gray-400">
                    {listing.review_count.toLocaleString()} reviews
                  </span>
                </>
              )}
            </div>
            <span className={cn(
              'text-xs font-semibold px-2.5 py-1 rounded-full',
              isOnboarded
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600'
            )}>
              {isOnboarded ? 'Book Now' : 'View Details'}
            </span>
          </div>

          {/* Add to active itinerary */}
          {activeItinerary && (
            <button
              onClick={handleAddToTrip}
              className={cn(
                'w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border transition-colors mt-1',
                alreadyInTrip || addedToTrip
                  ? 'border-green-300 text-green-700 bg-green-50'
                  : 'border-primary/30 text-primary hover:bg-primary/5'
              )}
            >
              {alreadyInTrip || addedToTrip ? (
                <><CheckCircle className="w-3.5 h-3.5" /> Added to {activeItinerary.title}</>
              ) : (
                <><PlusCircle className="w-3.5 h-3.5" /> Add to {activeItinerary.title}</>
              )}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ExploreClient({ total, initialCategory = 'all' }: { total: number; initialCategory?: string }) {
  const [category, setCategory] = useState(
    CATEGORIES.some((c) => c.id === initialCategory) ? initialCategory : 'all'
  );
  const [region, setRegion] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [listings, setListings] = useState<ApiListing[]>([]);
  const [count, setCount] = useState(total);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('default');

  const { setPins } = useMapStore();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const buildUrl = useCallback(
    (off: number) => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(off) });
      if (category !== 'all') params.set('category', category);
      if (region !== 'all') params.set('region', region);
      if (debouncedSearch) params.set('q', debouncedSearch);
      return `/api/listings?${params}`;
    },
    [category, region, debouncedSearch]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setOffset(0);
    fetch(buildUrl(0))
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) {
          setListings(json.data ?? []);
          setCount(json.count ?? 0);
          setOffset(PAGE_SIZE);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [buildUrl]);

  // Sync listings → map store when in map view
  useEffect(() => {
    if (viewMode === 'map' && listings.length > 0) {
      setPins(listings.map(listingToPin));
    }
  }, [viewMode, listings, setPins]);

  const loadMore = async () => {
    setLoadingMore(true);
    const res = await fetch(buildUrl(offset));
    const json = await res.json();
    setListings((prev) => [...prev, ...(json.data ?? [])]);
    setOffset((o) => o + PAGE_SIZE);
    setLoadingMore(false);
  };

  const hasMore = offset < count;

  // Client-side sort
  const sortedListings = [...listings].sort((a, b) => {
    if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
    if (sortBy === 'reviews') return b.review_count - a.review_count;
    if (sortBy === 'price_asc') return estimateListingPrice(a) - estimateListingPrice(b);
    if (sortBy === 'price_desc') return estimateListingPrice(b) - estimateListingPrice(a);
    return 0; // default: server order
  });

  return (
    <div className="space-y-6">
      {/* Search + region + view toggle row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search hotels, restaurants, experiences…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="relative">
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="appearance-none pl-4 pr-9 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
          >
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>

        {/* View toggle */}
        <div className="flex rounded-xl border overflow-hidden bg-background">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 text-sm transition-colors',
              viewMode === 'grid'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-label="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 text-sm transition-colors',
              viewMode === 'map'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-label="Map view"
          >
            <Map className="w-4 h-4" />
            <span className="hidden sm:inline">Map</span>
          </button>
        </div>
      </div>

      {/* Category tabs + sort row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1 w-fit">
          {CATEGORIES.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setCategory(id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                category === id
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {/* Sort select */}
        <div className="relative flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="appearance-none pl-1 pr-6 py-1.5 bg-transparent text-sm text-muted-foreground focus:outline-none cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Result count */}
      {!loading && (
        <p className="text-sm text-muted-foreground">
          {count.toLocaleString()} {count === 1 ? 'place' : 'places'} found
        </p>
      )}

      {/* Map view */}
      {viewMode === 'map' && (
        <div className="w-full rounded-2xl overflow-hidden border" style={{ height: '65vh' }}>
          <MapContainer className="w-full h-full" showControls />
        </div>
      )}

      {/* Grid view */}
      {viewMode === 'grid' && (
        loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-muted animate-pulse" style={{ height: '360px' }} />
            ))}
          </div>
        ) : sortedListings.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-2xl mb-2">🔍</p>
            <h3 className="font-semibold text-lg">No results found</h3>
            <p className="text-muted-foreground mt-1">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 rounded-xl border font-medium text-sm hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {loadingMore ? 'Loading…' : `Load more (${count - offset} remaining)`}
                </button>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
