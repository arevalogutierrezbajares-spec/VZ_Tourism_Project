'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star, Clock, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SafetyBadge } from '@/components/common/SafetyBadge';
import type { Listing } from '@/types/database';
import { formatCurrency, formatDuration, truncate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { LISTING_CATEGORIES } from '@/lib/constants';

interface ListingCardProps {
  listing: Listing;
  compact?: boolean;
  className?: string;
}

export function ListingCard({ listing, compact = false, className }: ListingCardProps) {
  const category = LISTING_CATEGORIES.find((c) => c.value === listing.category);

  if (compact) {
    return (
      <Link href={`/listing/${listing.slug}`}>
        <div className={cn(
          'flex gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer',
          className
        )}>
          {listing.cover_image_url && (
            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
              <Image src={listing.cover_image_url} alt={listing.title} fill className="object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm leading-tight line-clamp-1">{listing.title}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{listing.location_name}</p>
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="text-xs font-medium">{listing.rating.toFixed(1)}</span>
              </div>
              <span className="text-sm font-bold text-primary">
                {formatCurrency(listing.price_usd, 'USD')}
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/listing/${listing.slug}`}>
      <Card className={cn('group overflow-hidden hover:shadow-lg transition-all duration-300 border-0 shadow-sm', className)}>
        <div className="relative aspect-[4/3] overflow-hidden">
          {listing.cover_image_url ? (
            <Image
              src={listing.cover_image_url}
              alt={listing.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-sky-100 to-blue-200 flex items-center justify-center">
              <span className="text-4xl">{category?.icon || '📍'}</span>
            </div>
          )}
          <div className="absolute top-3 left-3 flex gap-1.5">
            <Badge className="bg-white/90 text-gray-800 text-xs capitalize border-0 shadow-sm">
              {category?.icon} {listing.category}
            </Badge>
            {listing.is_featured && (
              <Badge className="bg-amber-500 text-white text-xs border-0">Featured</Badge>
            )}
          </div>
          <div className="absolute top-3 right-3">
            <SafetyBadge level={listing.safety_level} size="sm" className="bg-white/90 border-0 shadow-sm" />
          </div>
        </div>

        <CardContent className="p-4">
          <div className="space-y-2">
            <div>
              <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                {listing.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">{listing.location_name}</p>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2">
              {truncate(listing.short_description, 100)}
            </p>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {listing.duration_hours && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(listing.duration_hours)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                Up to {listing.max_guests}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t">
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-medium">{listing.rating.toFixed(1)}</span>
                {listing.total_reviews > 0 && (
                  <span className="text-xs text-muted-foreground">({listing.total_reviews})</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-primary">
                  {formatCurrency(listing.price_usd, 'USD')}
                </span>
                <span className="text-xs text-muted-foreground ml-1">/ person</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
