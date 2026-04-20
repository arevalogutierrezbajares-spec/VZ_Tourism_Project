'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Map } from 'lucide-react';
import { useItineraryStore } from '@/stores/itinerary-store';
import { cn } from '@/lib/utils';

export function MyTripFab() {
  const { current, days, togglePanel, isOpen } = useItineraryStore();

  const stopCount = current ? days.reduce((sum, d) => sum + d.stops.length, 0) : 0;

  return (
    <AnimatePresence>
      {current && !isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: [0.0, 0.0, 0.2, 1] } }}
          exit={{ opacity: 0, scale: 0.9, y: 10, transition: { duration: 0.15, ease: [0.4, 0.0, 1, 1] } }}
          whileTap={{ scale: 0.96 }}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 will-change-transform"
        >
          <button
            onClick={togglePanel}
            className={cn(
              'flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 transition-[box-shadow,background-color,transform] duration-200 hover:shadow-xl hover:-translate-y-0.5',
              'text-sm font-semibold cursor-pointer'
            )}
            aria-label="Open trip planner"
          >
            <Map className="w-4 h-4" />
            <span>My Trip</span>
            {stopCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-xs font-bold tabular-nums">
                {stopCount}
              </span>
            )}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
