'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Clock, Users, MapPin, PlusCircle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SafetyBadge } from '@/components/common/SafetyBadge';
import { FavoriteButton } from '@/components/listing/FavoriteButton';
import { useItineraryStore } from '@/stores/itinerary-store';
import type { Listing, ListingCategory } from '@/types/database';
import { formatCurrency, formatDuration, cn } from '@/lib/utils';
import { LISTING_CATEGORIES } from '@/lib/constants';

// ── Shared types ─────────────────────────────────────────────────────────────

/** Lightweight listing from the browse API */
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

type CardListing = Listing | BrowseApiListing;

// ── Helpers ──────────────────────────────────────────────────────────────────

function isFullListing(l: CardListing): l is Listing {
  return 'price_usd' in l && 'total_reviews' in l;
}

const CATEGORY_ICONS: Record<string, string> = {
  hotel: '🏨', restaurant: '🍽️', experience: '🎒', posada: '🏡', tours: '🎒', other: '📍',
};

const TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotel', posada: 'Posada', hostal: 'Hostal', hospedaje: 'Hospedaje',
  alojamiento: 'Alojamiento', 'casa vacacional': 'Casa', restaurante: 'Restaurant',
  restaurant: 'Restaurant', cafe: 'Café', bar: 'Bar', tours: 'Tour', tour: 'Tour',
  transfer: 'Transfer', experience: 'Experience', agencia: 'Agency',
};

const REGION_LABELS: Record<string, string> = {
  caracas: 'Caracas', losroques: 'Los Roques', merida: 'Mérida',
  margarita: 'Isla Margarita', morrocoy: 'Morrocoy', canaima: 'Canaima',
  choroni: 'Choroní', falcon: 'Falcón', venezuela: 'Venezuela',
};

function getLocation(listing: CardListing): string {
  if (isFullListing(listing) && listing.location_name) return listing.location_name;
  const region = ('region' in listing ? listing.region : null) ?? '';
  return REGION_LABELS[region.toLowerCase()] ?? (region || 'Venezuela');
}

function getTypeLabel(listing: CardListing): string {
  if ('type' in listing && listing.type) return TYPE_LABELS[listing.type.toLowerCase()] ?? listing.type;
  const cat = listing.category ?? '';
  return TYPE_LABELS[cat.toLowerCase()] ?? (cat || 'Place');
}

function getCatIcon(listing: CardListing): string {
  const type = ('type' in listing ? listing.type?.toLowerCase() : null) ?? '';
  const cat = (listing.category ?? '').toLowerCase();
  return CATEGORY_ICONS[type] ?? CATEGORY_ICONS[cat] ?? '📍';
}

function getRating(listing: CardListing): number | null {
  return listing.rating ?? null;
}

function getReviewCount(listing: CardListing): number {
  if (isFullListing(listing)) return listing.total_reviews ?? 0;
  return ('review_count' in listing ? listing.review_count : 0) ?? 0;
}

function getPlatformStatus(listing: CardListing): string | undefined {
  return 'platform_status' in listing ? listing.platform_status : undefined;
}

function getIsOnboarded(listing: CardListing): boolean {
  const status = getPlatformStatus(listing);
  return status === 'verified' || status === 'founding_partner';
}

// ── Tags ─────────────────────────────────────────────────────────────────────

interface Tag { label: string; icon: string; color: string }

function generateTags(listing: CardListing): Tag[] {
  const tags: Tag[] = [];
  const region = (('region' in listing ? listing.region : '') ?? '').toLowerCase();
  const category = (listing.category ?? '').toLowerCase();
  const name = listing.title.toLowerCase();
  const rating = listing.rating ?? 0;
  const reviews = getReviewCount(listing);

  if (['losroques', 'morrocoy', 'choroni', 'margarita'].includes(region))
    tags.push({ label: 'Beachfront', icon: '🏖️', color: 'bg-primary/10 text-primary' });
  if (['merida', 'canaima'].includes(region))
    tags.push({ label: 'Mountain', icon: '⛰️', color: 'bg-secondary/10 text-secondary' });
  if (region === 'losroques' || region === 'margarita')
    tags.push({ label: 'Island', icon: '🏝️', color: 'bg-primary/10 text-primary' });
  if (region === 'caracas')
    tags.push({ label: 'City Center', icon: '🏙️', color: 'bg-muted text-muted-foreground' });
  if (region === 'losroques' || (category === 'experience' && region === 'margarita'))
    tags.push({ label: 'Diving', icon: '🤿', color: 'bg-primary/10 text-primary' });
  if (['merida', 'canaima'].includes(region) || category === 'adventure' || name.includes('hik') || name.includes('trek'))
    tags.push({ label: 'Hiking', icon: '🥾', color: 'bg-secondary/10 text-secondary' });
  if (region === 'canaima' || name.includes('nature') || name.includes('wildlife'))
    tags.push({ label: 'Nature', icon: '🌿', color: 'bg-secondary/10 text-secondary' });
  const type = ('type' in listing ? listing.type?.toLowerCase() : null) ?? '';
  if (type === 'posada' || type === 'casa vacacional')
    tags.push({ label: 'Boutique Stay', icon: '🏡', color: 'bg-accent/10 text-accent' });
  if (type === 'tours' || type === 'tour' || category === 'experience')
    tags.push({ label: 'Guided Tour', icon: '🎒', color: 'bg-primary/10 text-primary' });
  if (name.includes('spa') || name.includes('wellness') || category === 'wellness')
    tags.push({ label: 'Spa & Wellness', icon: '💆', color: 'bg-accent/10 text-accent' });
  if (name.includes('eco') || name.includes('natural') || name.includes('reserva'))
    tags.push({ label: 'Eco-Friendly', icon: '🌱', color: 'bg-secondary/10 text-secondary' });
  if (rating >= 4.5) tags.push({ label: 'Top Rated', icon: '🏆', color: 'bg-accent/10 text-accent' });
  if (reviews >= 500) tags.push({ label: 'Popular', icon: '🔥', color: 'bg-destructive/10 text-destructive' });
  if (reviews >= 50 && reviews < 500 && rating >= 4.0) tags.push({ label: 'Local Favorite', icon: '❤️', color: 'bg-destructive/10 text-destructive' });
  if (rating >= 4.0 && reviews < 50) tags.push({ label: 'Hidden Gem', icon: '💎', color: 'bg-primary/10 text-primary' });

  return tags.slice(0, 4);
}

// ── Sub-components ───────────────────────────────────────────────────���───────

function TierBadge({ status }: { status?: string }) {
  if (status === 'founding_partner') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/30">
        <span aria-hidden="true">🏆</span> Founding Partner
      </span>
    );
  }
  if (status === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/30">
        <CheckCircle className="w-3 h-3" aria-hidden="true" /> Verified Partner
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

// ── Image fallback ───────────────────────────────────────────────────────────

function ImageFallback({ icon, typeLabel }: { icon: string; typeLabel: string }) {
  return (
    <div className="w-full h-full bg-muted/80 flex flex-col items-center justify-center relative overflow-hidden">
      <span className="text-[100px] opacity-[0.08] absolute select-none" aria-hidden="true">🇻🇪</span>
      <span className="text-3xl mb-1.5 relative z-10 drop-shadow" aria-hidden="true">{icon}</span>
      <span className="text-muted-foreground/60 text-xs font-medium uppercase tracking-wider relative z-10">{typeLabel}</span>
    </div>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────

interface ListingCardProps {
  listing: CardListing;
  /** @default 'default' */
  variant?: 'default' | 'compact' | 'inline';
  /** @deprecated Use variant='inline' instead */
  compact?: boolean;
  className?: string;
}

// ── Main component ───────────────────────────────────────────────────────────

export function ListingCard({ listing, variant: variantProp, compact, className }: ListingCardProps) {
  const { current: activeItinerary, days, addStop, openPanel } = useItineraryStore();
  const [addedToTrip, setAddedToTrip] = useState(false);

  // Backward compat: compact prop maps to 'inline' variant
  const variant = variantProp ?? (compact ? 'inline' : 'default');

  const typeLabel = getTypeLabel(listing);
  const catIcon = getCatIcon(listing);
  const location = getLocation(listing);
  const rating = getRating(listing);
  const reviewCount = getReviewCount(listing);
  const platformStatus = getPlatformStatus(listing);
  const isOnboarded = getIsOnboarded(listing);
  const full = isFullListing(listing);
  const category = full ? LISTING_CATEGORIES.find((c) => c.value === listing.category) : null;

  const borderAccent =
    platformStatus === 'founding_partner' ? 'border-l-4 border-l-accent' :
    platformStatus === 'verified'         ? 'border-l-4 border-l-secondary' : '';

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
      description: full ? listing.short_description ?? null : null,
      latitude: full ? listing.latitude ?? null : null,
      longitude: full ? listing.longitude ?? null : null,
      location_name: full ? listing.location_name ?? null : ('region' in listing ? listing.region ?? null : null),
      start_time: null,
      end_time: null,
      duration_hours: full ? listing.duration_hours ?? null : null,
      cost_usd: full ? listing.price_usd ?? 0 : 0,
      transport_to_next: null,
      transport_duration_minutes: null,
      notes: null,
      listing: full ? listing : {
        title: listing.title,
        cover_image_url: listing.cover_image_url ?? null,
        slug: listing.slug,
        price_usd: 0,
        category: (listing.category ?? 'other') as ListingCategory,
        rating: listing.rating ?? 0,
        total_reviews: ('review_count' in listing ? listing.review_count : 0) ?? 0,
      } as Listing,
    });
    openPanel();
    setAddedToTrip(true);
    setTimeout(() => setAddedToTrip(false), 2500);
  };

  // ── Inline variant (horizontal mini card for sidepanels/modals) ────────────
  if (variant === 'inline') {
    return (
      <Link href={`/listing/${listing.slug}`}>
        <div className={cn(
          'flex gap-3 p-3 rounded-xl hover:bg-muted transition-colors cursor-pointer',
          className
        )}>
          {listing.cover_image_url && (
            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
              <Image src={listing.cover_image_url} alt={listing.title} fill sizes="64px" className="object-cover outline outline-1 -outline-offset-1 outline-black/10" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm leading-tight line-clamp-1">{listing.title}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{location}</p>
            <div className="flex items-center justify-between mt-1">
              {rating != null && (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-accent text-accent" />
                  <span className="text-xs font-medium tabular-nums">{rating.toFixed(1)}</span>
                </div>
              )}
              {full && listing.price_usd != null && (
                <span className="text-sm font-bold text-primary tabular-nums">
                  {formatCurrency(listing.price_usd, 'USD')}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // ── Compact variant (simplified card for search / book page) ───────────────
  if (variant === 'compact') {
    return (
      <Link href={`/listing/${listing.slug}`} className="group block">
        <div className={cn(
          'bg-background rounded-2xl shadow-sm hover:shadow-md motion-safe:hover:-translate-y-0.5 motion-safe:transition-[box-shadow,transform] duration-200 overflow-hidden border cursor-pointer active:scale-[0.97]',
          !isOnboarded && 'opacity-90',
          className
        )}>
          <div className="relative w-full aspect-[16/10] overflow-hidden">
            {listing.cover_image_url ? (
              <Image
                src={listing.cover_image_url}
                alt={listing.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover outline outline-1 -outline-offset-1 outline-black/10"
              />
            ) : (
              <ImageFallback icon={catIcon} typeLabel={typeLabel} />
            )}
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-[color] duration-150 text-balance">
              {listing.title}
            </h3>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                {location}
              </div>
              {!isOnboarded && (
                <span className="text-muted-foreground bg-muted text-xs px-2 py-0.5 rounded-full">Preview</span>
              )}
            </div>
            {full && listing.price_usd > 0 && (
              <p className="text-sm font-bold text-primary mt-2 tabular-nums">
                {formatCurrency(listing.price_usd, 'USD')}
                <span className="text-xs font-normal text-muted-foreground ml-1">/ person</span>
              </p>
            )}
            <div className="mt-3">
              <span className={cn(
                'text-xs font-semibold px-2.5 py-1 rounded-full',
                isOnboarded ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>
                {isOnboarded ? 'Book Now' : 'View Details'}
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // ── Default variant (main grid card) ───────────────────────────────────────
  const tags = generateTags(listing);

  return (
    <Link href={`/listing/${listing.slug}`} className="group block">
      <div className={cn(
        'bg-background rounded-2xl border border-border shadow-sm hover:shadow-lg motion-safe:hover:-translate-y-1 motion-safe:transition-[box-shadow,transform] duration-200 overflow-hidden cursor-pointer active:scale-[0.97]',
        borderAccent,
        !isOnboarded && platformStatus && 'opacity-90',
        className
      )}>
        {/* Photo */}
        <div className="relative w-full aspect-[16/10] overflow-hidden">
          {listing.cover_image_url ? (
            <Image
              src={listing.cover_image_url}
              alt={listing.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover motion-safe:group-hover:scale-105 transition-transform duration-500 outline outline-1 -outline-offset-1 outline-black/10"
            />
          ) : (
            <ImageFallback icon={catIcon} typeLabel={typeLabel} />
          )}

          {/* Top-left badges */}
          <div className="absolute top-3 left-3 flex gap-1.5">
            <span className="bg-black/40 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
              {typeLabel}
            </span>
            {full && listing.is_featured && (
              <Badge className="bg-accent text-accent-foreground text-xs border-0">Featured</Badge>
            )}
          </div>

          {/* Top-right: safety badge + favorite */}
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
            {full && listing.safety_level && (
              <SafetyBadge level={listing.safety_level} size="sm" className="bg-white/90 border-0 shadow-sm" />
            )}
            <FavoriteButton listingId={listing.id} />
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2.5">
          <TierBadge status={platformStatus} />

          {rating !== null && rating !== undefined && (
            <StarRating rating={rating} />
          )}

          <h3 className="font-bold text-base text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-[color] duration-150 text-balance">
            {listing.title}
          </h3>

          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{location}</span>
          </div>

          {/* Rich data from full Listing */}
          {full && (listing.duration_hours || listing.price_usd > 0) && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {listing.duration_hours && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(listing.duration_hours)}
                </span>
              )}
              {listing.max_guests != null && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Up to {listing.max_guests}
                </span>
              )}
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag.label} className={cn('inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium', tag.color)}>
                  <span aria-hidden="true">{tag.icon}</span>
                  {tag.label}
                </span>
              ))}
            </div>
          )}

          {/* Footer: price / reviews / CTA */}
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-2">
              {full && listing.price_usd > 0 && (
                <span className="text-sm font-bold text-primary tabular-nums">
                  {formatCurrency(listing.price_usd, 'USD')}
                </span>
              )}
              {!isOnboarded && platformStatus && (
                <span className="text-muted-foreground bg-muted text-xs px-2 py-0.5 rounded-full">Preview</span>
              )}
              {reviewCount > 0 && (
                <>
                  <span className="text-muted-foreground text-xs">·</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {reviewCount.toLocaleString()} reviews
                  </span>
                </>
              )}
            </div>
            <span className={cn(
              'text-xs font-semibold px-2.5 py-1 rounded-full',
              isOnboarded || !platformStatus ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}>
              {isOnboarded || !platformStatus ? 'Book Now' : 'View Details'}
            </span>
          </div>

          {/* Add to trip */}
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
