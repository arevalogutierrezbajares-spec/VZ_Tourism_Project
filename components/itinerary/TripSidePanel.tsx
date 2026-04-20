'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Bot, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useItineraryStore } from '@/stores/itinerary-store';
import { ItineraryDaySection } from './ItineraryDaySection';
import { PlanningChatPanel } from './PlanningChatPanel';
import { TripPanelHeader } from './TripPanelHeader';
import { cn } from '@/lib/utils';

export function TripSidePanel() {
  const {
    isOpen,
    activeTab,
    setActiveTab,
    days,
    current,
    lastAddedStopId,
    clearPeek,
    closePanel,
    openPanel,
    removeStop,
    moveStop,
  } = useItineraryStore();

  const peekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-peek: when a stop is added and panel is closed, briefly open it
  useEffect(() => {
    if (!lastAddedStopId) return;

    if (!isOpen) {
      openPanel();
      setActiveTab('stops');
      peekTimeoutRef.current = setTimeout(() => {
        // Only auto-close if user hasn't interacted
        clearPeek();
      }, 2500);
    } else {
      // Panel already open, just clear peek after highlight fades
      peekTimeoutRef.current = setTimeout(clearPeek, 2000);
    }

    return () => {
      if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current);
    };
  }, [lastAddedStopId, isOpen, openPanel, setActiveTab, clearPeek]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        closePanel();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closePanel]);

  const stopCount = days.reduce((sum, d) => sum + d.stops.length, 0);

  // Don't render anything if no trip exists
  if (!current) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          role="complementary"
          aria-label="Trip planner"
          className={cn(
            'fixed top-0 right-0 h-dvh w-[420px] max-w-[90vw] z-30',
            'bg-background border-l border-border/50 shadow-2xl',
            'flex flex-col',
            'hidden md:flex' // Desktop only — mobile uses MobileTripSheet
          )}
        >
          {/* Header */}
          <TripPanelHeader />

          {/* Tab bar */}
          <div role="tablist" className="flex border-b border-border/50 px-5">
            <button
              role="tab"
              aria-selected={activeTab === 'stops'}
              aria-controls="panel-stops"
              onClick={() => setActiveTab('stops')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors relative',
                activeTab === 'stops'
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <MapPin className="w-3.5 h-3.5" />
              Stops
              {stopCount > 0 && (
                <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold tabular-nums">
                  {stopCount}
                </span>
              )}
              {activeTab === 'stops' && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                />
              )}
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'ai'}
              aria-controls="panel-ai"
              onClick={() => setActiveTab('ai')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors relative',
                activeTab === 'ai'
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Bot className="w-3.5 h-3.5" />
              AI Planner
              {activeTab === 'ai' && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                />
              )}
            </button>
          </div>

          {/* Tab content — both mounted, inactive hidden to preserve state */}
          <div
            id="panel-stops"
            role="tabpanel"
            aria-labelledby="tab-stops"
            className={cn(
              'flex-1 overflow-y-auto',
              activeTab !== 'stops' && 'hidden'
            )}
          >
            {days.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No stops yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Browse listings and tap "Add to Trip" to start building your itinerary.
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {days.map((day) => (
                  <ItineraryDaySection
                    key={day.day}
                    day={day.day}
                    title={day.title}
                    stops={day.stops}
                    onRemoveStop={removeStop}
                    onMoveStop={moveStop}
                  />
                ))}
              </div>
            )}
          </div>

          <div
            id="panel-ai"
            role="tabpanel"
            aria-labelledby="tab-ai"
            className={cn(
              'flex-1 overflow-hidden',
              activeTab !== 'ai' && 'hidden'
            )}
          >
            <PlanningChatPanel mode="compact" />
          </div>

          {/* Footer */}
          <div className="border-t border-border/50 px-5 py-3 flex items-center justify-between">
            <Link
              href="/plan"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Open full planner
            </Link>
            {stopCount > 0 && (
              <p className="text-xs font-medium tabular-nums">
                Est. ${useItineraryStore.getState().totalCost.toLocaleString()}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
