'use client';

import { useState } from 'react';
import { X, Plus, Share2, Save, ChevronRight, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ItineraryDaySection } from './ItineraryDaySection';
import { CostEstimator } from './CostEstimator';
import { AddStopModal } from './AddStopModal';
import { useItinerary } from '@/hooks/use-itinerary';
import { cn } from '@/lib/utils';

interface ItineraryPanelProps {
  className?: string;
}

export function ItineraryPanel({ className }: ItineraryPanelProps) {
  const [addStopDay, setAddStopDay] = useState<number | null>(null);
  const {
    current,
    days,
    totalCost,
    isDirty,
    isSaving,
    isOpen,
    closePanel,
    addDay,
    removeDay,
    removeStop,
    save,
    shareItinerary,
  } = useItinerary();

  if (!isOpen || !current) return null;

  return (
    <>
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-80 bg-background shadow-2xl border-l z-30',
          'flex flex-col',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Map className="w-4 h-4 text-primary" />
            <div>
              <h3 className="font-semibold text-sm line-clamp-1">{current.title}</h3>
              <p className="text-xs text-muted-foreground">
                {days.length} day{days.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isDirty && (
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7"
                onClick={() => save()}
                disabled={isSaving}
                title="Save"
              >
                <Save className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={shareItinerary}
              title="Share"
            >
              <Share2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={closePanel}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5">
            {days.map((day) => (
              <ItineraryDaySection
                key={day.day}
                day={day.day}
                title={day.title}
                stops={day.stops}
                onAddStop={(d) => setAddStopDay(d)}
                onRemoveStop={removeStop}
                onRemoveDay={days.length > 1 ? removeDay : undefined}
              />
            ))}

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={addDay}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add day
            </Button>

            <CostEstimator totalCost={totalCost} />
          </div>
        </ScrollArea>

        {isDirty && (
          <div className="p-4 border-t bg-muted/30">
            <Button size="sm" className="w-full" onClick={() => save()} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        )}
      </div>

      {addStopDay !== null && (
        <AddStopModal
          isOpen
          day={addStopDay}
          onClose={() => setAddStopDay(null)}
        />
      )}
    </>
  );
}
