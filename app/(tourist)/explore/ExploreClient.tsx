'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MapPin, Search, ChevronDown, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const rating = listing.rating ?? 0;
  const reviews = listing.review_count ?? 0;
  const name = listing.title?.toLowerCase() ?? '';

  // Location tags
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

  // Activity tags
  if (region === 'losroques') {
    tags.push({ label: 'Diving', icon: '🤿', color: 'bg-teal-50 text-teal-700' });
  }
  if (['merida', 'canaima'].includes(region)) {
    tags.push({ label: 'Hiking', icon: '🥾', color: 'bg-green-50 text-green-700' });
  }
  if (region === 'canaima') {
    tags.push({ label: 'Nature', icon: '🌿', color: 'bg-lime-50 text-lime-700' });
  }

  // Quality tags
  if (rating >= 4.5) {
    tags.push({ label: 'Top Rated', icon: '🏆', color: 'bg-amber-50 text-amber-700' });
  }
  if (reviews >= 500) {
    tags.push({ label: 'Popular', icon: '🔥', color: 'bg-rose-50 text-rose-700' });
  }
  if (rating >= 4.0 && reviews < 50) {
    tags.push({ label: 'Hidden Gem', icon: '💎', color: 'bg-purple-50 text-purple-700' });
  }

  // Type tags
  if (type === 'posada') {
    tags.push({ label: 'Boutique Stay', icon: '🏡', color: 'bg-orange-50 text-orange-700' });
  }
  if (name.includes('eco') || name.includes('natural')) {
    tags.push({ label: 'Eco-Friendly', icon: '🌱', color: 'bg-green-50 text-green-700' });
  }

  return tags.slice(0, 4);
}

interface PriceInfo {
  label: string;
  level: number;
}

function getPriceLevel(listing: ApiListing): PriceInfo {
  const type = listing.type?.toLowerCase() ?? '';
  const region = listing.region?.toLowerCase() ?? '';
  const rating = listing.rating ?? 0;

  if (type === 'restaurante' || type === 'restaurant') {
    if (rating >= 4.5) return { label: '$$$', level: 3 };
    if (rating >= 4.0) return { label: '$$', level: 2 };
    return { label: '$', level: 1 };
  }
  if (type === 'tours' || type === 'tour') {
    return { label: '$$', level: 2 };
  }
  if (type === 'cafe' || type === 'bar') {
    return { label: '$', level: 1 };
  }
  // Accommodation
  if (region === 'losroques' && rating >= 4.0) return { label: '$$$$', level: 4 };
  if (rating >= 4.5 && type === 'hotel') return { label: '$$$', level: 3 };
  if (type === 'hotel') return { label: '$$', level: 2 };
  if (type === 'posada') return { label: '$$', level: 2 };
  return { label: '$', level: 1 };
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
  const { label, level } = getPriceLevel(listing);
  const max = 4;
  return (
    <span className="text-sm font-medium tracking-wide">
      <span className="text-gray-800">{label}</span>
      <span className="text-gray-300">{'$'.repeat(max - level)}</span>
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
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              aria-label="Save"
            >
              <Heart className="w-4 h-4 text-gray-500 hover:text-rose-500 transition-colors" />
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
        </div>
      </div>
    </Link>
  );
}

export function ExploreClient({ total }: { total: number }) {
  const [category, setCategory] = useState('all');
  const [region, setRegion] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [listings, setListings] = useState<ApiListing[]>([]);
  const [count, setCount] = useState(total);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

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

  const loadMore = async () => {
    setLoadingMore(true);
    const res = await fetch(buildUrl(offset));
    const json = await res.json();
    setListings((prev) => [...prev, ...(json.data ?? [])]);
    setOffset((o) => o + PAGE_SIZE);
    setLoadingMore(false);
  };

  const hasMore = offset < count;

  return (
    <div className="space-y-6">
      {/* Search + region filter row */}
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
      </div>

      {/* Category tabs */}
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

      {/* Result count */}
      {!loading && (
        <p className="text-sm text-muted-foreground">
          {count.toLocaleString()} {count === 1 ? 'place' : 'places'} found
        </p>
      )}

      {/* Listing grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-muted animate-pulse" style={{ height: '360px' }} />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-2xl mb-2">🔍</p>
          <h3 className="font-semibold text-lg">No results found</h3>
          <p className="text-muted-foreground mt-1">Try adjusting your filters or search term.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {listings.map((listing) => (
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
      )}
    </div>
  );
}
