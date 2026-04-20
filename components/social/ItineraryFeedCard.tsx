'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ReactionBar } from './ReactionBar';
import { Loader2, AlertCircle } from 'lucide-react';
import type { Itinerary } from '@/types/database';
import { formatCurrency, formatDate, getInitials, pluralize } from '@/lib/utils';

interface ItineraryFeedCardProps {
  itinerary: Itinerary & { recommendation_count?: number };
  showActions?: boolean;
  className?: string;
}

export function ItineraryFeedCard({ itinerary, showActions = false, className }: ItineraryFeedCardProps) {
  const router = useRouter();
  const [cloneState, setCloneState] = useState<'idle' | 'loading' | 'error'>('idle');
  const recommendCount = (itinerary as unknown as Record<string, unknown>).recommendation_count as number
    ?? (itinerary.saves + itinerary.likes);

  const handleCustomize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setCloneState('loading');
    try {
      const res = await fetch(`/api/itineraries/${itinerary.id}/clone`, { method: 'POST' });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) {
        setCloneState('error');
        setTimeout(() => setCloneState('idle'), 3000);
        return;
      }
      const { id } = await res.json();
      router.push(`/itinerary/${id}`);
    } catch {
      setCloneState('error');
      setTimeout(() => setCloneState('idle'), 3000);
    }
  };

  return (
    <Card className={`overflow-hidden hover:shadow-md transition-shadow rounded-2xl ${className || ''}`}>
      {itinerary.cover_image_url && (
        <Link href={`/itinerary/${itinerary.id}`}>
          <div className="relative aspect-video overflow-hidden">
            <Image
              src={itinerary.cover_image_url}
              alt={`Cover photo for ${itinerary.title}`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover motion-safe:hover:scale-105 transition-transform duration-500"
            />
            <span className="absolute top-2 left-2 bg-black/60 text-white text-xs font-semibold px-2.5 py-1 rounded-lg">
              {pluralize(itinerary.total_days, 'day')}
            </span>
            {itinerary.regions[0] && (
              <span className="absolute top-2 right-2 bg-primary/85 text-white text-xs px-2.5 py-1 rounded-lg">
                {itinerary.regions[0]}
              </span>
            )}
          </div>
        </Link>
      )}

      <CardContent className="p-4 space-y-3">
        {/* Author */}
        {itinerary.user && (
          <div className="flex items-center gap-2">
            <Avatar className="w-7 h-7">
              <AvatarImage src={itinerary.user.avatar_url || undefined} alt={`${itinerary.user.full_name}'s avatar`} />
              <AvatarFallback className="text-xs">
                {getInitials(itinerary.user.full_name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{itinerary.user.full_name}</span>
            {itinerary.user.role === 'creator' && (
              <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border-amber-200 dark:border-amber-800">Creator</Badge>
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
          {showActions && recommendCount > 0 && (
            <>
              <span className="text-primary font-semibold">{recommendCount.toLocaleString()} recommend</span>
              <span>·</span>
            </>
          )}
          <span>{pluralize(itinerary.total_days, 'day')}</span>
          {itinerary.estimated_cost_usd > 0 && (
            <>
              <span>·</span>
              <span>From {formatCurrency(itinerary.estimated_cost_usd)}</span>
            </>
          )}
          {!showActions && itinerary.start_date && (
            <>
              <span>·</span>
              <span>{formatDate(itinerary.start_date)}</span>
            </>
          )}
        </div>

        {itinerary.regions.length > 0 && !itinerary.cover_image_url && (
          <div className="flex flex-wrap gap-1.5">
            {itinerary.regions.slice(0, 3).map((region) => (
              <Badge key={region} variant="outline" className="text-xs">
                {region}
              </Badge>
            ))}
          </div>
        )}

        {showActions ? (
          <div className="flex items-center justify-between pt-1">
            <span className="text-base font-bold">
              {itinerary.estimated_cost_usd > 0 && (
                <>{formatCurrency(itinerary.estimated_cost_usd)} <span className="text-xs font-normal text-muted-foreground">/ person</span></>
              )}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCustomize}
                disabled={cloneState === 'loading'}
                className="cursor-pointer"
              >
                {cloneState === 'loading' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                {cloneState === 'error' && <AlertCircle className="w-3 h-3 mr-1 text-destructive" />}
                {cloneState === 'error' ? 'Failed' : 'Customize'}
              </Button>
              <Button size="sm" asChild className="cursor-pointer">
                <Link href={`/itinerary/${itinerary.id}`}>Book This Trip</Link>
              </Button>
            </div>
          </div>
        ) : (
          <ReactionBar
            likes={itinerary.likes}
            saves={itinerary.saves}
            className="-ml-2"
          />
        )}
      </CardContent>
    </Card>
  );
}
