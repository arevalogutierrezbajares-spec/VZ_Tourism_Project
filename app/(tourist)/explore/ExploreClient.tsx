'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Search, ChevronDown, LayoutGrid, Map, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMapStore } from '@/stores/map-store';
import { BrowseListingCard } from '@/components/listing/BrowseListingCard';
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
    // Price sorting removed — no reliable price data for scraped listings
    if (sortBy === 'price_asc' || sortBy === 'price_desc') return 0;
    return 0; // default: server order
  });

  return (
    <div className="space-y-6">
      {/* Search + region + view toggle row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <label htmlFor="explore-search" className="sr-only">Search listings</label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <input
            id="explore-search"
            type="search"
            placeholder="Search hotels, restaurants, experiences…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="relative">
          <label htmlFor="explore-region" className="sr-only">Filter by region</label>
          <select
            id="explore-region"
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
        <div className="flex rounded-xl border overflow-hidden bg-background" role="group" aria-label="View mode">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 text-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset',
              viewMode === 'grid'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-label="Grid view"
            aria-pressed={viewMode === 'grid'}
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 text-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset',
              viewMode === 'map'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-label="Map view"
            aria-pressed={viewMode === 'map'}
          >
            <Map className="w-4 h-4" />
            <span className="hidden sm:inline">Map</span>
          </button>
        </div>
      </div>

      {/* Category tabs + sort row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1 w-fit" role="tablist" aria-label="Filter by category">
          {CATEGORIES.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setCategory(id)}
              role="tab"
              aria-selected={category === id}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary',
                category === id
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span aria-hidden="true">{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {/* Sort select */}
        <div className="relative flex items-center gap-1.5">
          <label htmlFor="explore-sort" className="sr-only">Sort by</label>
          <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
          <select
            id="explore-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="appearance-none pl-1 pr-6 py-1.5 bg-transparent text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-md cursor-pointer"
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
        <p aria-live="polite" className="text-sm text-muted-foreground">
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
            <Search className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="font-semibold text-lg">No results found</h3>
            <p className="text-muted-foreground mt-1">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedListings.map((listing) => (
                <BrowseListingCard key={listing.id} listing={listing} />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 rounded-xl border font-medium text-sm hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary"
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
