'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<AIGeneratedStop[]>([]);
  const { addStop, current, days } = useItineraryStore();

  const handleDragStart = (e: React.DragEvent, stopId: string) => {
    e.dataTransfer.setData('text/plain', stopId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetOrder: number) => {
    e.preventDefault();
    setIsDragOver(false);
    const stopId = e.dataTransfer.getData('text/plain');
    if (!stopId || !onMoveStop) return;
    onMoveStop(stopId, day, targetOrder);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the container, not entering a child
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
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
    <div className={cn('rounded-xl border bg-background shadow-sm overflow-hidden', className)}>
      {/* Day header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30" role="heading" aria-level={4}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold tabular-nums shadow-sm">
            {day}
          </div>
          <h4 className="font-semibold text-sm">{title}</h4>
          <span className="text-[11px] text-muted-foreground tabular-nums">
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
        className={cn(
          'p-3 space-y-2 transition-colors duration-150',
          isDragOver && 'bg-primary/5'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, stops.length)}
      >
        <AnimatePresence initial={false}>
        {stops.map((stop, idx) => (
          <motion.div
            key={stop.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.0, 0.0, 0.2, 1], delay: idx * 0.05 } }}
            exit={{ opacity: 0, y: -12, transition: { duration: 0.15, ease: [0.4, 0.0, 1, 1] } }}
            layout
            draggable
            onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, stop.id)}
            onDrop={(e) => {
              e.stopPropagation();
              handleDrop(e as unknown as React.DragEvent, idx);
            }}
            onDragOver={(e) => {
              (e as unknown as React.DragEvent).preventDefault();
            }}
          >
            <ItineraryStopCard
              stop={stop}
              onRemove={onRemoveStop}
              isDraggable
              showPhoto
            />
          </motion.div>
        ))}
        </AnimatePresence>

        {stops.length === 0 && !suggestions.length && (
          <div
            className={cn(
              'py-4 border-2 border-dashed rounded-lg text-center transition-colors duration-150',
              isDragOver ? 'border-primary/40 bg-primary/5' : 'border-muted'
            )}
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
                className="text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
              >
                Dismiss
              </button>
            </div>
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAcceptSuggestion(suggestion)}
                className="w-full text-left p-2.5 rounded-lg border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-[background-color] duration-150 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                aria-label={`Add ${suggestion.title} to Day ${day}`}
              >
                <div className="flex items-start gap-2">
                  <Plus className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0 md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100 transition-opacity" />
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
                        <span className="tabular-nums">${suggestion.cost_usd}</span>
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
