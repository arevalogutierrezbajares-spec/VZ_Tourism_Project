'use client';

import { useRef, useState } from 'react';
import { Plus, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ItineraryStopCard } from './ItineraryStopCard';
import { useItineraryStore } from '@/stores/itinerary-store';
import type { ItineraryStop, AIGeneratedStop } from '@/types/database';
import { buildStopFromAI } from '@/types/database';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ItineraryDaySectionProps {
  day: number;
  title: string;
  stops: ItineraryStop[];
  onAddStop?: (day: number) => void;
  onRemoveStop?: (stopId: string) => void;
  onMoveStop?: (stopId: string, newDay: number, newOrder: number) => void;
  onRemoveDay?: (day: number) => void;
  className?: string;
}

export function ItineraryDaySection({
  day,
  title,
  stops,
  onAddStop,
  onRemoveStop,
  onMoveStop,
  onRemoveDay,
  className,
}: ItineraryDaySectionProps) {
  const dragStopIdRef = useRef<string | null>(null);
  const dragSourceDayRef = useRef<number | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<AIGeneratedStop[]>([]);
  const { addStop, current, days } = useItineraryStore();

  const handleDragStart = (stopId: string, sourceDay: number) => {
    dragStopIdRef.current = stopId;
    dragSourceDayRef.current = sourceDay;
  };

  const handleDrop = (e: React.DragEvent, targetOrder: number) => {
    e.preventDefault();
    const stopId = dragStopIdRef.current;
    if (!stopId || !onMoveStop) return;
    onMoveStop(stopId, day, targetOrder);
    dragStopIdRef.current = null;
    dragSourceDayRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleSuggestStops = async () => {
    setIsSuggesting(true);
    setSuggestions([]);
    try {
      const allStops = days.flatMap((d) =>
        d.stops.map((s) => ({
          day: d.day,
          title: s.title,
          location_name: s.location_name || undefined,
        }))
      );

      const response = await fetch('/api/ai/suggest-stops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day,
          total_days: days.length,
          regions: current?.regions || [],
          existing_stops: allStops,
          mode: 'suggest',
        }),
      });

      if (!response.ok) throw new Error('Failed to get suggestions');

      const data = await response.json();
      if (data.suggestions?.length > 0) {
        setSuggestions(data.suggestions);
      } else {
        toast('No suggestions found. Try adding more context to your itinerary.');
      }
    } catch {
      toast.error('Could not get AI suggestions');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleAcceptSuggestion = (suggestion: AIGeneratedStop) => {
    addStop(buildStopFromAI(suggestion, current?.id || '', day, stops.length));
    setSuggestions((prev) => prev.filter((s) => s.title !== suggestion.title));
    toast.success(`Added "${suggestion.title}"`);
  };

  const handleDismissSuggestions = () => {
    setSuggestions([]);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Day header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">
            {day}
          </div>
          <h4 className="font-semibold text-sm">{title}</h4>
          <span className="text-xs text-muted-foreground">
            {stops.length} stop{stops.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 min-w-[32px] min-h-[32px] text-muted-foreground hover:text-primary"
            onClick={handleSuggestStops}
            disabled={isSuggesting}
            aria-label={`Get AI suggestions for Day ${day}`}
          >
            {isSuggesting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
          </Button>
          {onRemoveDay && (
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 min-w-[32px] min-h-[32px] text-muted-foreground hover:text-destructive"
              onClick={() => onRemoveDay(day)}
              aria-label={`Remove Day ${day}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Stops */}
      <div
        className="ml-3 border-l-2 border-muted pl-3 space-y-2"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, stops.length)}
      >
        {stops.map((stop, idx) => (
          <div
            key={stop.id}
            draggable
            onDragStart={() => handleDragStart(stop.id, day)}
            onDrop={(e) => {
              e.stopPropagation();
              handleDrop(e, idx);
            }}
            onDragOver={handleDragOver}
          >
            <ItineraryStopCard
              stop={stop}
              onRemove={onRemoveStop}
              isDraggable
            />
          </div>
        ))}

        {stops.length === 0 && !suggestions.length && (
          <div
            className="py-4 border-2 border-dashed border-muted rounded-lg text-center"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 0)}
          >
            <p className="text-xs text-muted-foreground">
              Drop stops here or add one below
            </p>
          </div>
        )}

        {/* AI Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-medium text-primary flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI Suggestions
              </span>
              <button
                type="button"
                onClick={handleDismissSuggestions}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Dismiss
              </button>
            </div>
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAcceptSuggestion(suggestion)}
                className="w-full text-left p-2.5 rounded-lg border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors group cursor-pointer"
                aria-label={`Add ${suggestion.title} to Day ${day}`}
              >
                <div className="flex items-start gap-2">
                  <Plus className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">
                      {suggestion.title}
                    </p>
                    {suggestion.reason && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {suggestion.reason}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {suggestion.location_name && (
                        <span>{suggestion.location_name}</span>
                      )}
                      {suggestion.cost_usd > 0 && (
                        <span>${suggestion.cost_usd}</span>
                      )}
                      {suggestion.duration_hours && (
                        <span>{suggestion.duration_hours}h</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {onAddStop && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground h-8 text-xs border border-dashed"
            onClick={() => onAddStop(day)}
          >
            <Plus className="w-3 h-3 mr-1" />
            Add stop
          </Button>
        )}
      </div>
    </div>
  );
}
