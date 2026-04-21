'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Heart, PlusCircle, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useFavoritesStore } from '@/stores/favorites-store';
import { useItineraryStore } from '@/stores/itinerary-store';

export interface BrowseApiListing {
  id: string;
  title: string;
  slug: string;
  type?: string;
  category?: string;
  region?: string | null;
  city?: string | null;
  rating?: number | null;
  review_count?: number;
  cover_image_url?: string | null;
  platform_status?: string;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

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

interface Tag { label: string; icon: string; color: string }

function generateTags(listing: BrowseApiListing): Tag[] {
  const tags: Tag[] = [];
  const region = listing.region?.toLowerCase() ?? '';
  const type = listing.type?.toLowerCase() ?? '';
  const category = listing.category?.toLowerCase() ?? '';
  const rating = listing.rating ?? 0;
  const reviews = listing.review_count ?? 0;
  const name = listing.title?.toLowerCase() ?? '';

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
  if (region === 'losroques' || (category === 'experience' && region === 'margarita')) {
    tags.push({ label: 'Diving', icon: '🤿', color: 'bg-teal-50 text-teal-700' });
  }
  if (['merida', 'canaima'].includes(region) || category === 'adventure' || name.includes('hik') || name.includes('trek')) {
    tags.push({ label: 'Hiking', icon: '🥾', color: 'bg-green-50 text-green-700' });
  }
  if (region === 'canaima' || name.includes('nature') || name.includes('wildlife')) {
    tags.push({ label: 'Nature', icon: '🌿', color: 'bg-lime-50 text-lime-700' });
  }
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
  if (rating >= 4.5) tags.push({ label: 'Top Rated', icon: '🏆', color: 'bg-amber-50 text-amber-700' });
  if (reviews >= 500) tags.push({ label: 'Popular', icon: '🔥', color: 'bg-rose-50 text-rose-700' });
  if (reviews >= 50 && reviews < 500 && rating >= 4.0) tags.push({ label: 'Local Favorite', icon: '❤️', color: 'bg-rose-50 text-rose-700' });
  if (rating >= 4.0 && reviews < 50) tags.push({ label: 'Hidden Gem', icon: '💎', color: 'bg-purple-50 text-purple-700' });

  return tags.slice(0, 4);
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

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <div className="flex items-center gap-1" role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      <div className="flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: full }).map((_, i) => (
          <span key={`f${i}`} className="text-accent text-sm leading-none">★</span>
        ))}
        {half && <span className="text-accent text-sm leading-none">★</span>}
        {Array.from({ length: empty }).map((_, i) => (
          <span key={`e${i}`} className="text-muted-foreground/30 text-sm leading-none">★</span>
        ))}
      </div>
      <span className="text-sm font-semibold text-foreground tabular-nums">{rating.toFixed(1)}</span>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface BrowseListingCardProps {
  listing: BrowseApiListing;
  /** compact = simplified card used in search results (book page) */
  variant?: 'default' | 'compact';
}

export function BrowseListingCard({ listing, variant = 'default' }: BrowseListingCardProps) {
  const { favorites, addFavorite, removeFavorite } = useFavoritesStore();
  const { current: activeItinerary, days, addStop, openPanel } = useItineraryStore();
  const [addedToTrip, setAddedToTrip] = useState(false);

  const isFavorited = favorites.includes(listing.id);
  const isOnboarded = listing.platform_status === 'verified' || listing.platform_status === 'founding_partner';
  const alreadyInTrip = days.some((d) => d.stops.some((s) => s.listing_id === listing.id));

  const gradient = CATEGORY_GRADIENTS[listing.category ?? ''] ?? CATEGORY_GRADIENTS.other;
  const catIcon = CATEGORY_ICONS[listing.type?.toLowerCase() ?? ''] ?? CATEGORY_ICONS[listing.category ?? ''] ?? '📍';
  const typeLabel = TYPE_LABELS[listing.type?.toLowerCase() ?? ''] ?? listing.type ?? 'Place';
  const regionLabel = REGION_LABELS[listing.region?.toLowerCase() ?? ''] ?? listing.region ?? 'Venezuela';
  const borderAccent =
    listing.platform_status === 'founding_partner' ? 'border-l-4 border-l-amber-400' :
    listing.platform_status === 'verified'         ? 'border-l-4 border-l-emerald-400' : '';

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

  // ── Compact variant (book page / search results) ──────────────────────────
  if (variant === 'compact') {
    return (
      <Link href={`/listing/${listing.slug}`} className="group block">
        <div className={cn(
          'bg-background rounded-2xl shadow-sm hover:shadow-md motion-safe:hover:-translate-y-0.5 motion-safe:transition-[box-shadow,transform] duration-200 overflow-hidden border cursor-pointer active:scale-[0.97]',
          !isOnboarded && 'opacity-90'
        )}>
          <div className="relative w-full aspect-[16/10] overflow-hidden">
            {listing.cover_image_url ? (
              <Image
                src={listing.cover_image_url}
                alt={listing.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover outline outline-1 -outline-offset-1 outline-black/10"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.srcset = '';
                  img.src = 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800&q=80';
                }}
              />
            ) : (
              <div className="w-full h-full bg-muted/80 flex items-center justify-center relative overflow-hidden">
                <span className="text-[80px] opacity-[0.08] absolute select-none">🇻🇪</span>
                <span className="text-2xl relative z-10">{catIcon}</span>
              </div>
            )}
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-[color] duration-150 text-balance">
              {listing.title}
            </h3>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                {regionLabel}
              </div>
              {!isOnboarded && (
                <span className="text-muted-foreground bg-muted text-xs px-2 py-0.5 rounded-full">
                  Preview
                </span>
              )}
            </div>
            <div className="mt-3">
              <span className={cn(
                'text-xs font-semibold px-2.5 py-1 rounded-full',
                isOnboarded ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
              )}>
                {isOnboarded ? 'Book Now' : 'View Details'}
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // ── Default variant (explore grid) ───────────────────────────────────────
  const tags = generateTags(listing);

  return (
    <Link href={`/listing/${listing.slug}`} className="group block">
      <div className={cn(
        'bg-background rounded-2xl border border-border shadow-sm hover:shadow-lg motion-safe:hover:-translate-y-1 motion-safe:transition-[box-shadow,transform] duration-200 overflow-hidden cursor-pointer active:scale-[0.97]',
        borderAccent,
        !isOnboarded && 'opacity-90'
      )}>
        {/* Photo area — 16:10 */}
        <div className="relative w-full aspect-[16/10] overflow-hidden">
            {listing.cover_image_url ? (
              <Image
                src={listing.cover_image_url}
                alt={listing.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover outline outline-1 -outline-offset-1 outline-black/10"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.srcset = '';
                  img.src = 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800&q=80';
                }}
              />
            ) : (
              <div className="w-full h-full bg-muted/80 flex flex-col items-center justify-center relative overflow-hidden">
                <span className="text-[100px] opacity-[0.08] absolute select-none">🇻🇪</span>
                <span className="text-3xl mb-1.5 relative z-10 drop-shadow">{catIcon}</span>
                <span className="text-muted-foreground/60 text-xs font-medium uppercase tracking-wider relative z-10">{typeLabel}</span>
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
              className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow hover:bg-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isFavorited) removeFavorite(listing.id);
                else addFavorite(listing.id);
              }}
              aria-label={isFavorited ? 'Remove from saved' : 'Save to favorites'}
              aria-pressed={isFavorited}
            >
              <Heart className={cn('w-5 h-5 transition-colors', isFavorited ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground hover:text-rose-500')} aria-hidden="true" />
            </button>
          </div>

        {/* Content area */}
        <div className="p-4 space-y-2.5">
          <TierBadge status={listing.platform_status} />

          {listing.rating !== null && listing.rating !== undefined && (
            <StarRating rating={listing.rating} />
          )}

          <h3 className="font-bold text-base text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-[color] duration-150 text-balance">
            {listing.title}
          </h3>

          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{regionLabel}</span>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag.label} className={cn('inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium', tag.color)}>
                  <span>{tag.icon}</span>
                  {tag.label}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-2">
              {!isOnboarded && (
                <span className="text-muted-foreground bg-muted text-xs px-2 py-0.5 rounded-full">Preview</span>
              )}
              {(listing.review_count ?? 0) > 0 && (
                <>
                  <span className="text-muted-foreground text-xs">·</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {(listing.review_count ?? 0).toLocaleString()} reviews
                  </span>
                </>
              )}
            </div>
            <span className={cn(
              'text-xs font-semibold px-2.5 py-1 rounded-full',
              isOnboarded ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}>
              {isOnboarded ? 'Book Now' : 'View Details'}
            </span>
          </div>

          {activeItinerary && (
            <button
              onClick={handleAddToTrip}
              className={cn(
                'w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border transition-colors mt-1',
                alreadyInTrip || addedToTrip
                  ? 'border-status-confirmed/40 text-status-confirmed bg-status-confirmed/5'
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
