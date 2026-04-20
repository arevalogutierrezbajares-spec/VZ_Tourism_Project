'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useItineraryStore } from '@/stores/itinerary-store';

export function TripPanelHeader() {
  const { current, days, totalCost, closePanel } = useItineraryStore();

  const stopCount = days.reduce((sum, d) => sum + d.stops.length, 0);
  const title = current?.title || 'My Trip';

  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold truncate">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {days.length} {days.length === 1 ? 'day' : 'days'} &middot;{' '}
          {stopCount} {stopCount === 1 ? 'stop' : 'stops'}
          {totalCost > 0 && (
            <span className="ml-1">&middot; ${totalCost.toLocaleString()}</span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={closePanel}
          aria-label="Close trip planner"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
