'use client';

import { MapPin, Clock, Users, Globe, CheckCircle, XCircle, Star } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ImageGallery } from '@/components/common/ImageGallery';
import { SafetyBadge } from '@/components/common/SafetyBadge';
import { BookingForm } from './BookingForm';
import { ReviewSection } from './ReviewSection';
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
  const category = LISTING_CATEGORIES.find((c) => c.value === listing.category);
  const photos = listing.photos || [];
  const allImages = [
    ...(listing.cover_image_url ? [{ url: listing.cover_image_url, alt: listing.title }] : []),
    ...photos.map((p) => ({ url: p.url, alt: p.alt || listing.title })),
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="capitalize">
                {category?.icon} {listing.category}
              </Badge>
              <SafetyBadge level={listing.safety_level} />
              {listing.is_featured && (
                <Badge className="bg-amber-500 text-white">Featured</Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">{listing.title}</h1>
            <div className="flex items-center gap-2 text-muted-foreground text-sm flex-wrap">
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <strong className="text-foreground">{listing.rating.toFixed(1)}</strong>
                <span>({pluralize(listing.total_reviews, 'review')})</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {listing.location_name}
              </span>
            </div>
          </div>
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
                <span className="font-medium text-sm">{formatDuration(listing.duration_hours)}</span>
                <span className="text-xs text-muted-foreground">Duration</span>
              </div>
            )}
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-muted/30">
              <Users className="w-5 h-5 text-primary mb-1" />
              <span className="font-medium text-sm">Up to {listing.max_guests}</span>
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
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {listing.description}
            </p>
          </div>

          <Separator />

          {/* Includes/Excludes */}
          {(listing.includes.length > 0 || listing.excludes.length > 0) && (
            <div className="grid grid-cols-2 gap-6">
              {listing.includes.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">What's included</h3>
                  <ul className="space-y-2">
                    {listing.includes.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
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
                        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
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
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{listing.provider.rating.toFixed(1)}</span>
                      <span>·</span>
                      <span>{pluralize(listing.provider.total_reviews, 'review')}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
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
              Reviews {reviews.length > 0 && `(${reviews.length})`}
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
        <div className="lg:col-span-1">
          <BookingForm listing={listing} />
        </div>
      </div>
    </div>
  );
}
