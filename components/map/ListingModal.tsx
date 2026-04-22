'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Star, MapPin, PlusCircle, ExternalLink, Clock,
  Users, Phone, Globe, CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MapPin as MapPinType } from '@/types/map';
import { formatCurrency, cn } from '@/lib/utils';
import { useItineraryStore } from '@/stores/itinerary-store';
import toast from 'react-hot-toast';

interface ListingDetail {
  id: string;
  title: string;
  slug: string;
  description?: string;
  short_description?: string;
  category?: string;
  type?: string;
  region?: string;
  city?: string;
  address?: string;
  rating?: number | null;
  review_count?: number;
  price_usd?: number | null;
  cover_image_url?: string | null;
  phone?: string;
  website?: string;
  instagram_handle?: string;
  platform_status?: string;
  amenities?: string[];
  duration_hours?: number | null;
  max_guests?: number | null;
  safety_level?: string;
  photos?: { url: string; alt?: string }[];
}

interface ListingModalProps {
  pin: MapPinType;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotel', posada: 'Posada', hostal: 'Hostal', hospedaje: 'Hospedaje',
  restaurante: 'Restaurant', restaurant: 'Restaurant', cafe: 'Café', bar: 'Bar',
  tours: 'Tour', tour: 'Tour', experience: 'Experience', agencia: 'Agency',
};

export function ListingModal({ pin, onClose }: ListingModalProps) {
  const [detail, setDetail] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const { current, days, addStop, openPanel } = useItineraryStore();

  // Fetch full listing details
  useEffect(() => {
    if (!pin.listingId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/listings/${pin.listingId}`);
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (!cancelled) setDetail(json.data ?? json);
      } catch {
        // Fall back to pin data only
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [pin.listingId]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleAddToItinerary = useCallback(() => {
    if (!current) {
      toast.error('Create an itinerary first');
      return;
    }
    const targetDay = days[0]?.day ?? 1;
    const existingStops = days.find((d) => d.day === targetDay)?.stops ?? [];
    addStop({
      itinerary_id: current.id,
      listing_id: pin.listingId ?? null,
      day: targetDay,
      order: existingStops.length,
      title: pin.title,
      description: detail?.short_description ?? null,
      latitude: pin.lat,
      longitude: pin.lng,
      location_name: pin.title,
      cost_usd: detail?.price_usd ?? pin.price ?? 0,
      duration_hours: detail?.duration_hours ?? null,
      start_time: null,
      end_time: null,
      transport_to_next: null,
      transport_duration_minutes: null,
      notes: null,
    });
    openPanel();
    toast.success(`Added "${pin.title}" to Day ${targetDay}`);
  }, [current, days, addStop, openPanel, pin, detail]);

  const images = detail?.photos?.length
    ? detail.photos.map((p) => p.url)
    : detail?.cover_image_url
      ? [detail.cover_image_url]
      : pin.imageUrl
        ? [pin.imageUrl]
        : [];

  const rating = detail?.rating ?? pin.rating;
  const reviewCount = detail?.review_count ?? pin.reviewCount ?? 0;
  const price = detail?.price_usd ?? pin.price;
  const location = [detail?.city ?? pin.city, detail?.region ?? pin.region].filter(Boolean).join(', ');
  const typeLabel = detail?.type ? TYPE_LABELS[detail.type.toLowerCase()] ?? detail.type : pin.category ?? '';
  const isVerified = detail?.platform_status === 'verified' || detail?.platform_status === 'founding_partner';
  const isFounding = detail?.platform_status === 'founding_partner';

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        onClick={onClose}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Modal */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={pin.title}
          className="relative bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] } }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Image gallery */}
          <div className="relative w-full aspect-[16/10] bg-muted flex-shrink-0">
            {images.length > 0 ? (
              <>
                <Image
                  src={images[activeImage]}
                  alt={pin.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 512px"
                  className="object-cover"
                />
                {images.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.slice(0, 5).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveImage(i)}
                        className={cn(
                          'w-2 h-2 rounded-full transition-all duration-200',
                          i === activeImage ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/80'
                        )}
                        aria-label={`View image ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <span className="text-[80px] opacity-[0.08] absolute select-none" aria-hidden="true">🇻🇪</span>
                <MapPin className="w-8 h-8 text-muted-foreground/30" />
              </div>
            )}

            {/* Badges on image */}
            <div className="absolute top-3 left-3 flex gap-1.5">
              {typeLabel && (
                <span className="bg-black/50 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full capitalize">
                  {typeLabel}
                </span>
              )}
            </div>

            {/* Close */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 w-9 h-9 bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm rounded-full"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {loading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-16 bg-muted rounded" />
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="space-y-2">
                  {/* Tier badge */}
                  {isFounding && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/30">
                      <span aria-hidden="true">🏆</span> Founding Partner
                    </span>
                  )}
                  {isVerified && !isFounding && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/30">
                      <CheckCircle className="w-3 h-3" /> Verified Partner
                    </span>
                  )}

                  <h2 className="font-bold text-xl leading-tight text-balance">{pin.title}</h2>

                  {/* Rating + reviews */}
                  {rating != null && rating > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-semibold tabular-nums">{rating.toFixed(1)}</span>
                      </div>
                      {reviewCount > 0 && (
                        <span className="text-sm text-muted-foreground tabular-nums">
                          ({reviewCount.toLocaleString()} reviews)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Location */}
                  {location && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{location}</span>
                      {detail?.address && detail.address !== location && (
                        <span className="text-xs">· {detail.address}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick stats */}
                <div className="flex items-center gap-4 py-3 border-y">
                  {price != null && price > 0 && (
                    <div>
                      <span className="text-lg font-bold text-primary tabular-nums">{formatCurrency(price, 'USD')}</span>
                      <span className="text-xs text-muted-foreground ml-1">/ person</span>
                    </div>
                  )}
                  {detail?.duration_hours != null && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{detail.duration_hours}h</span>
                    </div>
                  )}
                  {detail?.max_guests != null && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      <span>Up to {detail.max_guests}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {(detail?.short_description || detail?.description) && (
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                    {detail.short_description || detail.description}
                  </p>
                )}

                {/* Amenities */}
                {detail?.amenities && detail.amenities.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Amenities</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {detail.amenities.slice(0, 8).map((a) => (
                        <Badge key={a} variant="secondary" className="text-xs capitalize">{a}</Badge>
                      ))}
                      {detail.amenities.length > 8 && (
                        <Badge variant="outline" className="text-xs">+{detail.amenities.length - 8}</Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Contact info */}
                {(detail?.phone || detail?.website) && (
                  <div className="flex flex-wrap gap-3 text-sm">
                    {detail.phone && (
                      <a href={`tel:${detail.phone}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                        <Phone className="w-3.5 h-3.5" />
                        {detail.phone}
                      </a>
                    )}
                    {detail.website && (
                      <a href={detail.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                        <Globe className="w-3.5 h-3.5" />
                        Website
                      </a>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sticky footer actions */}
          <div className="flex-shrink-0 border-t p-4 flex gap-3 bg-background">
            <Button variant="outline" className="flex-1 gap-2" onClick={handleAddToItinerary}>
              <PlusCircle className="w-4 h-4" />
              Add to Trip
            </Button>
            {pin.listingId && (detail?.slug || pin.slug) && (
              <Link
                href={`/listing/${detail?.slug ?? pin.slug}`}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-[min(var(--radius-md),12px)] px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                View Full Details
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
