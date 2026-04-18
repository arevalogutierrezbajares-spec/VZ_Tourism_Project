'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useItineraryStore } from '@/stores/itinerary-store';
import type { ItineraryStop } from '@/types/database';
import { formatCurrency, formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Alternative {
  listing_id: string | null;
  title: string;
  description: string;
  location_name: string;
  latitude: number | null;
  longitude: number | null;
  cost_usd: number;
  duration_hours: number | null;
  reason: string;
}

interface ItineraryStopCardProps {
  stop: ItineraryStop;
  onRemove?: (id: string) => void;
  isDraggable?: boolean;
  className?: string;
}

export function ItineraryStopCard({
  stop,
  onRemove,
  isDraggable,
  className,
}: ItineraryStopCardProps) {
  const [isLoadingAlts, setIsLoadingAlts] = useState(false);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const { updateStop, current, days } = useItineraryStore();

  const handleGetAlternatives = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleSwap = (alt: Alternative) => {
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

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex gap-3 p-3 bg-background rounded-xl border hover:shadow-sm transition-shadow group">
        {isDraggable && (
          <div className="flex items-center cursor-grab text-muted-foreground/50 hover:text-muted-foreground">
            <GripVertical className="w-4 h-4" />
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start gap-2">
            <p className="font-medium text-sm line-clamp-1 flex-1">{stop.title}</p>
            <div className="flex items-center gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                onClick={handleGetAlternatives}
                disabled={isLoadingAlts}
                title="Suggest alternatives"
              >
                {isLoadingAlts ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : alternatives.length > 0 ? (
                  <X className="w-3 h-3" />
                ) : (
                  <ArrowLeftRight className="w-3 h-3" />
                )}
              </Button>
              {onRemove && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(stop.id)}
                >
                  <Trash2 className="w-3 h-3" />
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
              <span className="text-xs font-medium text-primary flex items-center gap-0.5">
                <DollarSign className="w-3 h-3" />
                {stop.cost_usd.toFixed(0)}
              </span>
            )}
            {stop.source_type === 'ai_suggested' && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-primary/10 text-primary border-0">
                <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                AI
              </Badge>
            )}
          </div>

          {stop.transport_to_next && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground italic">
              <span>&rarr;</span>
              <span>{stop.transport_to_next}</span>
              {stop.transport_duration_minutes && (
                <span>({stop.transport_duration_minutes} min)</span>
              )}
            </div>
          )}
        </div>
      </div>

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
              className="w-full text-left p-2 rounded-lg border border-dashed border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <p className="text-xs font-medium line-clamp-1">{alt.title}</p>
              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                {alt.reason}
              </p>
              <div className="flex gap-2 mt-0.5 text-[11px] text-muted-foreground">
                {alt.location_name && <span>{alt.location_name}</span>}
                {alt.cost_usd > 0 && <span>${alt.cost_usd}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
