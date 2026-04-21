'use client';

import { Minus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useItineraryStore } from '@/stores/itinerary-store';

export function TripPanelHeader() {
  const { current, days, totalCost, closePanel, addDay, removeDay } = useItineraryStore();

  const stopCount = days.reduce((sum, d) => sum + d.stops.length, 0);
  const title = current?.title || 'My Trip';
  const dayCount = days.length;

  const handleRemoveLastDay = () => {
    if (dayCount <= 1) return;
    removeDay(dayCount);
  };

  return (
    <div className="px-5 py-4 border-b border-border/50 space-y-3">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold truncate">{title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {stopCount} {stopCount === 1 ? 'stop' : 'stops'}
            {totalCost > 0 && (
              <span className="ml-1">&middot; ${totalCost.toLocaleString()}</span>
            )}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-11 h-11 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50"
          onClick={closePanel}
          aria-label="Close trip planner"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Days selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Days</span>
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-md cursor-pointer"
            onClick={handleRemoveLastDay}
            disabled={dayCount <= 1}
            aria-label="Remove a day"
          >
            <Minus className="w-3.5 h-3.5" />
          </Button>
          <span className="text-sm font-semibold tabular-nums w-6 text-center">{dayCount}</span>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-md cursor-pointer"
            onClick={addDay}
            aria-label="Add a day"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
