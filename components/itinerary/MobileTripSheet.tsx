'use client';

import { Drawer } from 'vaul';
import { MapPin, DollarSign } from 'lucide-react';
import { useItineraryStore } from '@/stores/itinerary-store';
import { cn } from '@/lib/utils';

interface MobileTripSheetProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileTripSheet({ children, className }: MobileTripSheetProps) {
  const { days, totalCost } = useItineraryStore();

  const totalStops = days.reduce((sum, d) => sum + d.stops.length, 0);
  const hasContent = totalStops > 0;

  if (!hasContent) return null;

  return (
    <Drawer.Root>
      {/* Collapsed pill trigger */}
      <Drawer.Trigger asChild>
        <button
          type="button"
          className={cn(
            'fixed bottom-4 left-1/2 -translate-x-1/2 z-40',
            'flex items-center gap-3 px-4 py-2.5',
            'bg-background/95 backdrop-blur-sm border shadow-lg rounded-full',
            'text-sm font-medium hover:shadow-xl transition-shadow',
            'md:hidden',
            className
          )}
        >
          <MapPin className="w-4 h-4 text-primary" />
          <span>
            {days.length} {days.length === 1 ? 'day' : 'days'}, {totalStops}{' '}
            {totalStops === 1 ? 'stop' : 'stops'}
          </span>
          {totalCost > 0 && (
            <span className="flex items-center gap-0.5 text-muted-foreground">
              <DollarSign className="w-3 h-3" />
              {totalCost.toFixed(0)}
            </span>
          )}
          <span className="text-xs text-muted-foreground">View ↑</span>
        </button>
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl max-h-[85vh] flex flex-col">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header */}
          <div className="px-4 pb-3 border-b">
            <h3 className="font-semibold text-base">Your Trip</h3>
            <p className="text-xs text-muted-foreground">
              {days.length} {days.length === 1 ? 'day' : 'days'}, {totalStops}{' '}
              {totalStops === 1 ? 'stop' : 'stops'}
              {totalCost > 0 && ` · ~$${totalCost.toFixed(0)}`}
            </p>
          </div>

          {/* Trip preview content (scrollable) */}
          <div className="flex-1 overflow-y-auto p-4">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
