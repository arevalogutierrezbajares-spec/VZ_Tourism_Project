'use client';

import { Clock, MapPin, Trash2, GripVertical, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ItineraryStop } from '@/types/database';
import { formatCurrency, formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';

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
  return (
    <div
      className={cn(
        'flex gap-3 p-3 bg-background rounded-xl border hover:shadow-sm transition-shadow group',
        className
      )}
    >
      {isDraggable && (
        <div className="flex items-center cursor-grab text-muted-foreground/50 hover:text-muted-foreground">
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start gap-2">
          <p className="font-medium text-sm line-clamp-1 flex-1">{stop.title}</p>
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(stop.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
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
        </div>

        {stop.transport_to_next && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground italic">
            <span>→</span>
            <span>{stop.transport_to_next}</span>
            {stop.transport_duration_minutes && (
              <span>({stop.transport_duration_minutes} min)</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
