'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Users, Globe, CheckCircle, XCircle, Star, MessageCircle, ExternalLink } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ImageGallery } from '@/components/common/ImageGallery';
import { SafetyBadge } from '@/components/common/SafetyBadge';
import { BookingForm } from './BookingForm';
import { ListingMap } from './ListingMap';
import { ReviewSection } from './ReviewSection';
import { useRecentlyViewed } from '@/hooks/use-recently-viewed';
import { useItineraryStore } from '@/stores/itinerary-store';
import type { Listing, Review } from '@/types/database';
import { formatDuration, pluralize } from '@/lib/utils';
import { LISTING_CATEGORIES } from '@/lib/constants';

interface ListingDetailProps {
  listing: Listing;
  reviews: Review[];
  canReview?: boolean;
  bookingId?: string;
}

export function ListingDetail({ listing, reviews, canReview, bookingId }: ListingDetailProps) {
  const { track } = useRecentlyViewed();
  const { addStop, days, openPanel } = useItineraryStore();
  const [addedToItinerary, setAddedToItinerary] = useState(false);

  useEffect(() => {
    track({
      id: listing.id,
      slug: listing.slug,
      title: listing.title,
      cover_image_url: listing.cover_image_url,
      location_name: listing.location_name,
      price_usd: listing.price_usd,
      category: listing.category,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing.id]);
  const category = LISTING_CATEGORIES.find((c) => c.value === listing.category);
  const photos = listing.photos || [];
  const allImages = [
    ...(listing.cover_image_url ? [{ url: listing.cover_image_url, alt: listing.title }] : []),
    ...photos.map((p) => ({ url: p.url, alt: p.alt || listing.title })),
  ];

  const scrollToBooking = () => {
    const el = document.getElementById('booking-form-anchor');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="capitalize">
                {category?.icon} {listing.category}
              </Badge>
              <SafetyBadge level={listing.safety_level} />
              {listing.is_featured && (
                <Badge className="bg-accent text-accent-foreground">Featured</Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-balance">{listing.title}</h1>
            <div className="flex items-center gap-2 text-muted-foreground text-sm flex-wrap">
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-accent text-accent" />
                <strong className="text-foreground tabular-nums">{listing.rating.toFixed(1)}</strong>
                <span className="tabular-nums">({pluralize(listing.total_reviews, 'review')})</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {listing.location_name}
              </span>
            </div>
          </div>
          {/* Price — above fold on mobile; hidden on desktop where sidebar handles it */}
          {listing.price_usd > 0 && (
            <div className="lg:hidden text-right shrink-0">
              <p className="text-2xl font-bold tabular-nums">${listing.price_usd.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">per person</p>
            </div>
          )}
        </div>
      </div>

      {/* Gallery */}
      {allImages.length > 0 && (
        <div className="mb-8">
          <ImageGallery images={allImages} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-4">
            {listing.duration_hours && (
              <div className="flex flex-col items-center text-center p-3 rounded-xl bg-muted/30">
                <Clock className="w-5 h-5 text-primary mb-1" />
                <span className="font-medium text-sm tabular-nums">{formatDuration(listing.duration_hours)}</span>
                <span className="text-xs text-muted-foreground">Duration</span>
              </div>
            )}
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-muted/30">
              <Users className="w-5 h-5 text-primary mb-1" />
              <span className="font-medium text-sm tabular-nums">Up to {listing.max_guests}</span>
              <span className="text-xs text-muted-foreground">Guests</span>
            </div>
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-muted/30">
              <Globe className="w-5 h-5 text-primary mb-1" />
              <span className="font-medium text-sm">{listing.languages.join(', ').toUpperCase()}</span>
              <span className="text-xs text-muted-foreground">Languages</span>
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h2 className="text-xl font-bold mb-3">About this experience</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-pretty">
              {listing.description}
            </p>
          </div>

          <Separator />

          {/* Includes/Excludes */}
          {(listing.includes.length > 0 || listing.excludes.length > 0) && (
            <div className="grid grid-cols-2 gap-6">
              {listing.includes.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">What&#39;s included</h3>
                  <ul className="space-y-2">
                    {listing.includes.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-status-confirmed flex-shrink-0 mt-0.5" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {listing.excludes.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Not included</h3>
                  <ul className="space-y-2">
                    {listing.excludes.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <XCircle className="w-4 h-4 text-status-cancelled flex-shrink-0 mt-0.5" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Provider */}
          {listing.provider && (
            <>
              <Separator />
              <div>
                <h2 className="text-xl font-bold mb-4">Your host</h2>
                <div className="flex items-start gap-4">
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={listing.provider.logo_url || undefined} />
                    <AvatarFallback>{listing.provider.business_name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{listing.provider.business_name}</h3>
                      {listing.provider.is_verified && (
                        <Badge variant="secondary" className="text-xs">Verified</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                      <Star className="w-3.5 h-3.5 fill-accent text-accent" />
                      <span className="tabular-nums">{listing.provider.rating.toFixed(1)}</span>
                      <span>·</span>
                      <span className="tabular-nums">{pluralize(listing.provider.total_reviews, 'review')}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed text-pretty">
                      {listing.provider.description}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Reviews */}
          <div>
            <h2 className="text-xl font-bold mb-4">
              Reviews {reviews.length > 0 && <span className="tabular-nums">({reviews.length})</span>}
            </h2>
            <ReviewSection
              listingId={listing.id}
              reviews={reviews}
              canReview={canReview}
              bookingId={bookingId}
            />
          </div>
        </div>

        {/* Sidebar - Booking form */}
        <div id="booking-form-anchor" className="lg:col-span-1 lg:sticky lg:top-24 space-y-4 self-start">
          <BookingForm listing={listing} />

          {/* Add to itinerary */}
          <button
            onClick={() => {
              const targetDay = days.length > 0 ? days[days.length - 1].day : 1;
              const stopCount = days.length > 0
                ? days[days.length - 1].stops.length
                : 0;
              addStop({
                itinerary_id: '',
                day: targetDay,
                order: stopCount + 1,
                listing_id: listing.id,
                title: listing.title,
                description: listing.short_description ?? null,
                latitude: listing.latitude ?? null,
                longitude: listing.longitude ?? null,
                location_name: listing.location_name ?? null,
                start_time: null,
                end_time: null,
                duration_hours: listing.duration_hours ?? null,
                cost_usd: listing.price_usd ?? 0,
                transport_to_next: null,
                transport_duration_minutes: null,
                notes: null,
                listing: listing,
              });
              openPanel();
              setAddedToItinerary(true);
              setTimeout(() => setAddedToItinerary(false), 2500);
            }}
            className="w-full py-3 rounded-xl border-2 border-primary text-primary font-semibold text-sm hover:bg-primary/5 transition-colors duration-150 ease-out flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {addedToItinerary ? '✓ Added to itinerary' : '+ Add to itinerary'}
          </button>

          {/* Map */}
          {listing.latitude && listing.longitude && (
            <div>
              <ListingMap
                lat={listing.latitude}
                lng={listing.longitude}
                title={listing.title}
                className="w-full h-48 rounded-xl overflow-hidden border"
              />
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {listing.location_name}
              </p>
            </div>
          )}

          {listing.cancellation_policy && (
            <div className="p-4 rounded-xl bg-muted/30 border text-sm">
              <p className="font-semibold mb-1">Cancellation policy</p>
              <p className="text-muted-foreground leading-relaxed text-pretty">{listing.cancellation_policy}</p>
            </div>
          )}

          {/* WhatsApp contact */}
          {listing.provider?.whatsapp_number && (
            <a
              href={`https://wa.me/${listing.provider.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in "${listing.title}"`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-green-500 text-green-600 font-semibold text-sm hover:bg-green-50 transition-colors duration-150 ease-out"
            >
              <MessageCircle className="w-4 h-4" />
              Message on WhatsApp
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          )}
        </div>
      </div>

      {/* Sticky mobile booking CTA — hidden on lg+ where sidebar is visible */}
      <div className="fixed bottom-16 left-0 right-0 z-30 lg:hidden px-4 pb-2">
        <div className="bg-background border border-border rounded-xl shadow-lg flex items-center justify-between px-4 py-3">
          <div>
            <span className="text-lg font-bold text-foreground tabular-nums">${listing.price_usd.toFixed(2)}</span>
            <span className="text-xs text-muted-foreground ml-1">/ person / night</span>
          </div>
          <motion.button
            type="button"
            onClick={scrollToBooking}
            whileTap={{ scale: 0.96 }}
            className="bg-primary text-primary-foreground font-semibold text-sm px-5 py-2 rounded-lg hover:opacity-90 transition-opacity duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Reserve
          </motion.button>
        </div>
      </div>
    </div>
  );
}
