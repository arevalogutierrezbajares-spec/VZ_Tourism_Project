'use client';

import Link from 'next/link';
import { Map } from 'lucide-react';
import { useItineraryStore } from '@/stores/itinerary-store';
import { cn } from '@/lib/utils';

export function MyTripFab() {
  const { current, days } = useItineraryStore();

  if (!current) return null;

  const stopCount = days.reduce((sum, d) => sum + d.stops.length, 0);

  return (
    <Link
      href="/plan"
      className={cn(
        'fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40',
        'flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg',
        'bg-primary text-primary-foreground',
        'hover:bg-primary/90 transition-all hover:shadow-xl hover:-translate-y-0.5',
        'text-sm font-semibold'
      )}
      aria-label="View my trip"
    >
      <Map className="w-4 h-4" />
      <span>My Trip</span>
      {stopCount > 0 && (
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-xs font-bold">
          {stopCount}
        </span>
      )}
    </Link>
  );
}
