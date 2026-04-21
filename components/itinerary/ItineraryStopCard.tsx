'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Clock,
  MapPin,
  Trash2,
  GripVertical,
  DollarSign,
  Sparkles,
  Loader2,
  ArrowLeftRight,
  X,
  ImageOff,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useItineraryStore } from '@/stores/itinerary-store';
import type { ItineraryStop, AIGeneratedStop } from '@/types/database';
import { formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ItineraryStopCardProps {
  stop: ItineraryStop;
  onRemove?: (id: string) => void;
  onSwapRequest?: (stop: ItineraryStop) => void;
  isDraggable?: boolean;
  /** Show listing photo when available */
  showPhoto?: boolean;
  /** Show transport connector below this card */
  showTransport?: boolean;
  className?: string;
}

export function ItineraryStopCard({
  stop,
  onRemove,
  onSwapRequest,
  isDraggable,
  showPhoto = false,
  showTransport = true,
  className,
}: ItineraryStopCardProps) {
  const [isLoadingAlts, setIsLoadingAlts] = useState(false);
  const [alternatives, setAlternatives] = useState<AIGeneratedStop[]>([]);
  const [imgError, setImgError] = useState(false);
  const { updateStop, current, days } = useItineraryStore();

  const coverUrl = stop.listing?.cover_image_url;
  const hasPhoto = showPhoto && coverUrl && !imgError;

  const handleGetAlternatives = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // If a swap request handler is provided (full mode), use that instead
    if (onSwapRequest) {
      onSwapRequest(stop);
      return;
    }

    if (alternatives.length > 0) {
      setAlternatives([]);
      return;
    }

    setIsLoadingAlts(true);
    try {
      const response = await fetch('/api/ai/suggest-stops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day: stop.day,
          total_days: days.length,
          regions: current?.regions || [],
          existing_stops: [
            { day: stop.day, title: stop.title, location_name: stop.location_name || undefined },
          ],
          mode: 'alternatives',
        }),
      });

      if (!response.ok) throw new Error('Failed');

      const data = await response.json();
      if (data.suggestions?.length > 0) {
        setAlternatives(data.suggestions);
      } else {
        toast('No alternatives found');
      }
    } catch {
      toast.error('Could not load alternatives');
    } finally {
      setIsLoadingAlts(false);
    }
  };

  const handleSwap = (alt: AIGeneratedStop) => {
    updateStop(stop.id, {
      listing_id: alt.listing_id,
      title: alt.title,
      description: alt.description || null,
      latitude: alt.latitude ?? null,
      longitude: alt.longitude ?? null,
      location_name: alt.location_name || null,
      cost_usd: alt.cost_usd || 0,
      duration_hours: alt.duration_hours ?? null,
      source_type: 'ai_suggested',
      notes: `Swapped from "${stop.title}" — ${alt.reason}`,
    });
    setAlternatives([]);
    toast.success(`Swapped to "${alt.title}"`);
  };

  const listing = stop.listing;
  const hasDetails = !!(listing?.description || listing?.short_description || stop.description || stop.notes || coverUrl || stop.location_name || stop.start_time || stop.duration_hours);

  // The main card content (extracted for reuse inside popover trigger)
  const cardContent = (
    <div className={cn(
      'flex gap-3 p-3 bg-background rounded-xl border hover:shadow-md motion-safe:hover:-translate-y-0.5 transition-[box-shadow,transform] duration-200 group cursor-default',
      hasPhoto && 'p-0 overflow-hidden'
    )}>
      {/* Listing photo */}
      {hasPhoto && (
        <div className="relative w-20 h-20 shrink-0">
          <Image
            src={coverUrl!}
            alt={stop.title}
            fill
            className="object-cover"
            sizes="80px"
            onError={() => setImgError(true)}
          />
        </div>
      )}

      {/* Photo fallback placeholder (only in showPhoto mode when no image) */}
      {showPhoto && !hasPhoto && (
        <div className="w-20 h-20 shrink-0 bg-muted flex items-center justify-center rounded-l-lg">
          <ImageOff className="w-5 h-5 text-muted-foreground/40" />
        </div>
      )}

      {isDraggable && !showPhoto && (
        <div className="flex items-center cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground" aria-label="Drag to reorder">
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      <div className={cn('flex-1 min-w-0 space-y-1', hasPhoto && 'p-3')}>
        <div className="flex items-start gap-2">
          <p className="font-medium text-sm line-clamp-1 flex-1">{stop.title}</p>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 min-w-[28px] min-h-[28px] md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
              onClick={handleGetAlternatives}
              disabled={isLoadingAlts}
              aria-label={alternatives.length > 0 ? `Hide alternatives for ${stop.title}` : `Suggest alternatives for ${stop.title}`}
            >
              {isLoadingAlts ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : alternatives.length > 0 ? (
                <X className="w-3.5 h-3.5" />
              ) : (
                <ArrowLeftRight className="w-3.5 h-3.5" />
              )}
            </Button>
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 min-w-[28px] min-h-[28px] md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(stop.id)}
                aria-label={`Remove ${stop.title}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {stop.location_name && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {stop.location_name}
          </p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {stop.start_time && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {stop.start_time}
              {stop.end_time && ` - ${stop.end_time}`}
            </span>
          )}
          {stop.duration_hours && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {formatDuration(stop.duration_hours)}
            </Badge>
          )}
          {stop.cost_usd > 0 && (
            <span className="text-xs font-medium text-primary flex items-center gap-0.5 tabular-nums">
              <DollarSign className="w-3 h-3" />
              {stop.cost_usd.toFixed(0)}
            </span>
          )}
          {stop.source_type === 'ai_suggested' && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-primary/10 text-primary border-0" title="AI-generated suggestion — verify details">
              <Sparkles className="w-2.5 h-2.5 mr-0.5" aria-hidden="true" />
              AI
            </Badge>
          )}
        </div>
      </div>
    </div>
  );

  // Detail popover content
  const popoverDetail = (
    <div className="w-80 space-y-3">
      {/* Photo */}
      {coverUrl && (
        <div className="relative w-full aspect-[16/10] rounded-lg overflow-hidden">
          <Image
            src={coverUrl}
            alt={stop.title}
            fill
            className="object-cover"
            sizes="320px"
          />
          {listing?.category && (
            <div className="absolute top-2 left-2">
              <span className="bg-black/50 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-full capitalize">
                {listing.category}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Title & location */}
      <div>
        <h4 className="font-semibold text-sm">{stop.title}</h4>
        {stop.location_name && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />
            {stop.location_name}
          </p>
        )}
      </div>

      {/* Rating & reviews */}
      {listing?.rating != null && listing.rating > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            <Star className="w-3.5 h-3.5 fill-accent text-accent" />
            <span className="text-xs font-semibold tabular-nums">{listing.rating.toFixed(1)}</span>
          </div>
          {listing.total_reviews > 0 && (
            <span className="text-xs text-muted-foreground">
              ({listing.total_reviews} {listing.total_reviews === 1 ? 'review' : 'reviews'})
            </span>
          )}
        </div>
      )}

      {/* Description */}
      {(listing?.short_description || listing?.description || stop.description) && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
          {listing?.short_description || listing?.description || stop.description}
        </p>
      )}

      {/* Details row */}
      <div className="flex items-center gap-3 flex-wrap text-xs">
        {stop.start_time && (
          <span className="flex items-center gap-1 text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
            <Clock className="w-3 h-3" />
            {stop.start_time}{stop.end_time && ` - ${stop.end_time}`}
          </span>
        )}
        {stop.duration_hours && (
          <span className="bg-muted/50 px-2 py-1 rounded-full text-muted-foreground">
            {formatDuration(stop.duration_hours)}
          </span>
        )}
        {stop.cost_usd > 0 && (
          <span className="flex items-center gap-0.5 font-medium text-primary bg-primary/5 px-2 py-1 rounded-full">
            <DollarSign className="w-3 h-3" />
            {stop.cost_usd.toFixed(0)}
          </span>
        )}
      </div>

      {/* Notes */}
      {stop.notes && (
        <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
          {stop.notes}
        </p>
      )}

      {/* Tags */}
      {listing?.tags && listing.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {listing.tags.slice(0, 5).map((tag) => (
            <span key={tag} className="text-[11px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className={cn('space-y-1', className)}>
      {hasDetails ? (
        <Popover>
          <PopoverTrigger render={<div />} openOnHover delay={300} closeDelay={150}>
            {cardContent}
          </PopoverTrigger>
          <PopoverContent side="left" sideOffset={12} align="start" className="w-auto p-4 rounded-2xl shadow-lg">
            {popoverDetail}
          </PopoverContent>
        </Popover>
      ) : (
        cardContent
      )}

      {/* Transport connector */}
      {showTransport && stop.transport_to_next && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-4 py-1">
          <div className="w-px h-3 bg-border" />
          <span className="italic">
            {stop.transport_to_next}
            {stop.transport_duration_minutes && ` (${stop.transport_duration_minutes} min)`}
          </span>
        </div>
      )}

      {/* Alternatives dropdown */}
      {alternatives.length > 0 && (
        <div className="ml-7 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <span className="text-xs text-muted-foreground px-1 flex items-center gap-1">
            <ArrowLeftRight className="w-3 h-3" />
            Swap with:
          </span>
          {alternatives.map((alt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSwap(alt)}
              className="w-full text-left p-2 rounded-lg border border-dashed border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-[border-color,background-color] duration-150"
            >
              <p className="text-xs font-medium line-clamp-1">{alt.title}</p>
              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                {alt.reason}
              </p>
              <div className="flex gap-2 mt-0.5 text-[11px] text-muted-foreground">
                {alt.location_name && <span>{alt.location_name}</span>}
                {alt.cost_usd > 0 && <span className="tabular-nums">${alt.cost_usd}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
