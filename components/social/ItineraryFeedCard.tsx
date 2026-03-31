'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ReactionBar } from './ReactionBar';
import type { Itinerary } from '@/types/database';
import { formatCurrency, formatDate, getInitials, pluralize } from '@/lib/utils';

interface ItineraryFeedCardProps {
  itinerary: Itinerary;
  className?: string;
}

export function ItineraryFeedCard({ itinerary, className }: ItineraryFeedCardProps) {
  return (
    <Card className={`overflow-hidden hover:shadow-md transition-shadow ${className || ''}`}>
      {itinerary.cover_image_url && (
        <Link href={`/itinerary/${itinerary.id}`}>
          <div className="relative aspect-video overflow-hidden">
            <Image
              src={itinerary.cover_image_url}
              alt={itinerary.title}
              fill
              className="object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>
        </Link>
      )}

      <CardContent className="p-4 space-y-3">
        {/* Author */}
        {itinerary.user && (
          <div className="flex items-center gap-2">
            <Avatar className="w-7 h-7">
              <AvatarImage src={itinerary.user.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {getInitials(itinerary.user.full_name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{itinerary.user.full_name}</span>
            {itinerary.user.role === 'creator' && (
              <Badge variant="secondary" className="text-xs">Creator</Badge>
            )}
          </div>
        )}

        {/* Title and details */}
        <Link href={`/itinerary/${itinerary.id}`}>
          <h3 className="font-bold text-base hover:text-primary transition-colors line-clamp-2">
            {itinerary.title}
          </h3>
        </Link>

        {itinerary.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{itinerary.description}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span>{pluralize(itinerary.total_days, 'day')}</span>
          {itinerary.estimated_cost_usd > 0 && (
            <>
              <span>·</span>
              <span>From {formatCurrency(itinerary.estimated_cost_usd)}</span>
            </>
          )}
          {itinerary.start_date && (
            <>
              <span>·</span>
              <span>{formatDate(itinerary.start_date)}</span>
            </>
          )}
        </div>

        {itinerary.regions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {itinerary.regions.slice(0, 3).map((region) => (
              <Badge key={region} variant="outline" className="text-xs">
                {region}
              </Badge>
            ))}
          </div>
        )}

        <ReactionBar
          likes={itinerary.likes}
          saves={itinerary.saves}
          className="-ml-2"
        />
      </CardContent>
    </Card>
  );
}
