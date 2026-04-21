'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Share2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlanningChatPanel } from '@/components/itinerary/PlanningChatPanel';
import { SmartStarters } from '@/components/itinerary/SmartStarters';
import { TripMap } from '@/components/itinerary/TripMap';
import { ItineraryDaySection } from '@/components/itinerary/ItineraryDaySection';
import { MobileTripSheet } from '@/components/itinerary/MobileTripSheet';
import { useItineraryStore } from '@/stores/itinerary-store';
import type { AIGeneratedDay } from '@/types/database';
import { buildStopFromAI } from '@/types/database';
import toast from 'react-hot-toast';

function PlanPageSkeleton() {
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b">
        <div className="h-4 w-28 bg-muted rounded-md animate-pulse" />
        <div className="h-4 w-24 bg-muted rounded-md animate-pulse" />
        <div className="h-7 w-14 bg-muted rounded-lg animate-pulse" />
      </div>
      {/* Two-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 md:w-[55%] md:border-r flex flex-col p-4 gap-3">
          <div className="h-10 bg-muted rounded-xl animate-pulse" />
          <div className="h-16 bg-muted/60 rounded-xl animate-pulse w-3/4" />
          <div className="h-10 bg-muted/40 rounded-xl animate-pulse w-1/2 self-end" />
          <div className="h-16 bg-muted/60 rounded-xl animate-pulse w-4/5" />
          <div className="flex-1" />
          <div className="h-11 bg-muted rounded-xl animate-pulse" />
        </div>
        {/* Right panel */}
        <div className="hidden md:flex md:w-[45%] flex-col">
          <div className="h-[40%] border-b bg-muted/30 animate-pulse" />
          <div className="flex-1 p-4 space-y-3">
            <div className="h-8 bg-muted rounded-xl animate-pulse" />
            <div className="h-16 bg-muted/60 rounded-xl animate-pulse" />
            <div className="h-16 bg-muted/60 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlanPageWrapper() {
  return (
    <Suspense fallback={<PlanPageSkeleton />}>
      <PlanPage />
    </Suspense>
  );
}

function PlanPage() {
  const searchParams = useSearchParams();
  const {
    current,
    days,
    totalCost,
    isDirty,
    isSaving,
    addDay,
    addStop,
    removeStop,
    moveStop,
    removeDay,
    save,
    setItinerary,
  } = useItineraryStore();

  // Ref to sendMessage from PlanningChatPanel (exposed via onReady)
  const sendMessageRef = useRef<((msg: string) => void) | null>(null);

  // Initialize a local itinerary if none exists
  useEffect(() => {
    if (!current) {
      const now = new Date().toISOString();
      setItinerary({
        id: `local-${Date.now()}`,
        title: 'My Venezuela Trip',
        description: null,
        user_id: 'anonymous',
        regions: [],
        total_days: 0,
        estimated_cost_usd: 0,
        cover_image_url: null,
        start_date: null,
        end_date: null,
        is_public: false,
        is_template: false,
        is_influencer_pick: false,
        referral_code: null,
        tags: [],
        saves: 0,
        likes: 0,
        views: 0,
        created_at: now,
        updated_at: now,
        stops: [],
      });
    }
  }, [current, setItinerary]);

  // Handle URL params for pre-selection
  const [initialMessage, setInitialMessage] = useState<string | null>(null);
  useEffect(() => {
    const vibe = searchParams.get('vibe');
    const numDays = searchParams.get('days');
    if (vibe && numDays) {
      setInitialMessage(
        `I want a ${numDays}-day trip focused on ${vibe} in Venezuela.`
      );
    }
  }, [searchParams]);

  // Handle progressive day-plan events from the AI stream
  const handleDayPlan = useCallback(
    (dayPlan: AIGeneratedDay) => {
      const itineraryId = current?.id || '';
      const existingDays = useItineraryStore.getState().days;

      // Ensure enough days exist (use computed delta — snapshot doesn't update)
      const needed = dayPlan.day - existingDays.length;
      for (let i = 0; i < needed; i++) {
        addDay();
      }

      // Check if this day already has stops (replacement scenario)
      const existingDay = useItineraryStore.getState().days.find(
        (d) => d.day === dayPlan.day
      );
      if (existingDay && existingDay.stops.length > 0) {
        // Remove existing stops for this day (last write wins)
        for (const stop of existingDay.stops) {
          removeStop(stop.id);
        }
      }

      // Add new stops
      for (let i = 0; i < dayPlan.stops.length; i++) {
        addStop(buildStopFromAI(dayPlan.stops[i], itineraryId, dayPlan.day, i));
      }
    },
    [current?.id, addDay, addStop, removeStop]
  );

  // Handle full itinerary finalization
  const handleItinerary = useCallback(
    (itineraryDays: AIGeneratedDay[]) => {
      // Only apply if no progressive days were built
      const currentDays = useItineraryStore.getState().days;
      const hasStops = currentDays.some((d) => d.stops.length > 0);
      if (hasStops) return; // Progressive build already populated

      const itineraryId = current?.id || '';
      for (let i = currentDays.length; i < itineraryDays.length; i++) {
        addDay();
      }
      for (const genDay of itineraryDays) {
        for (let i = 0; i < genDay.stops.length; i++) {
          addStop(buildStopFromAI(genDay.stops[i], itineraryId, genDay.day, i));
        }
      }
    },
    [current?.id, addDay, addStop]
  );

  const handleSave = async () => {
    await save();
    toast.success('Trip saved!');
  };

  const handleShare = () => {
    if (current?.id?.startsWith('local-')) {
      toast('Sign in to share your trip', { icon: '🔒' });
      return;
    }
    const url = `${window.location.origin}/itinerary/${current?.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  // Warn before navigating away with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const totalStops = days.reduce((sum, d) => sum + d.stops.length, 0);

  // Trip preview content (shared between desktop sidebar and mobile sheet)
  const tripPreview = (
    <div className="space-y-4">
      {days.map((day) => (
        <ItineraryDaySection
          key={day.day}
          day={day.day}
          title={day.title}
          stops={day.stops}
          onRemoveStop={removeStop}
          onMoveStop={moveStop}
          onRemoveDay={days.length > 1 ? removeDay : undefined}
        />
      ))}
      {days.length === 0 && (
        <SmartStarters
          onSend={(msg) => sendMessageRef.current?.(msg)}
        />
      )}
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Minimal top bar */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b bg-background/95 backdrop-blur-sm z-20">
        <Link
          href="/map"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back to Explore"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Explore</span>
        </Link>

        <h1 className="text-sm font-semibold">Plan Your Trip</h1>

        <div className="flex items-center gap-1.5">
          {isDirty && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="h-7 text-xs"
            >
              {isSaving ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <Save className="w-3 h-3 mr-1" />
              )}
              Save
            </Button>
          )}
          {totalStops > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="h-7 text-xs"
            >
              <Share2 className="w-3 h-3 mr-1" />
              Share
            </Button>
          )}
        </div>
      </header>

      {/* Main content: two columns on desktop, chat-only on mobile */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Conversation panel (55% desktop, full on mobile) */}
        <div className="flex-1 md:w-[55%] md:flex-none md:border-r">
          <PlanningChatPanel
            mode="full"
            onDayPlan={handleDayPlan}
            onItinerary={handleItinerary}
            onReady={(send) => { sendMessageRef.current = send; }}
          />
        </div>

        {/* Right: Trip preview + Map (45% desktop, hidden on mobile) */}
        <div className="hidden md:flex md:w-[45%] flex-col">
          {/* Map */}
          <div className="h-[40%] border-b">
            <TripMap />
          </div>

          {/* Trip preview */}
          <div className="flex-1 overflow-y-auto">
            {/* Summary bar */}
            {totalStops > 0 && (
              <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {days.length} {days.length === 1 ? 'day' : 'days'},{' '}
                  {totalStops} {totalStops === 1 ? 'stop' : 'stops'}
                </span>
                {totalCost > 0 && (
                  <span className="text-xs font-medium">
                    ~${totalCost.toFixed(0)}
                  </span>
                )}
              </div>
            )}

            <div className="p-4">{tripPreview}</div>
          </div>
        </div>
      </div>

      {/* Mobile: bottom sheet for trip preview */}
      <MobileTripSheet>
        {/* Map in mobile sheet */}
        <div className="h-48 rounded-xl overflow-hidden border mb-4">
          <TripMap />
        </div>
        {tripPreview}
      </MobileTripSheet>
    </div>
  );
}
