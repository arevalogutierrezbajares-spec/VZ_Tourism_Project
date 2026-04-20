'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin, DollarSign, Clock, ChevronLeft, Plus, Trash2,
  Save, Share2, Globe, Lock,
} from 'lucide-react';
import { useItineraryStore } from '@/stores/itinerary-store';
import { formatCurrency } from '@/lib/utils';

export default function DraftItineraryPage() {
  const router = useRouter();
  const {
    current, days, totalCost, isDirty, isSaving,
    addDay, removeDay, removeStop, save, openPanel,
  } = useItineraryStore();

  // If no draft, redirect to itineraries list
  useEffect(() => {
    if (typeof window !== 'undefined' && !current) {
      router.replace('/itineraries');
    }
  }, [current, router]);

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

  if (!current) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const isAnonymous = current.id.startsWith('local-');
  const totalStops = days.reduce((n, d) => n + d.stops.length, 0);

  return (
    <div className="container px-4 py-8 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <Link
        href="/itineraries"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Itineraries
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isAnonymous ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                <Lock className="w-3 h-3" /> Draft — sign in to save
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                <Globe className="w-3 h-3" /> Private
              </span>
            )}
            {isDirty && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Unsaved changes
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold">{current.title}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1.5">
            {current.regions.length > 0 && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {current.regions.join(' → ')}
              </span>
            )}
            <span>{days.length} {days.length === 1 ? 'day' : 'days'}</span>
            <span>{totalStops} {totalStops === 1 ? 'stop' : 'stops'}</span>
            {totalCost > 0 && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                ~{formatCurrency(totalCost)} estimated
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={isSaving || !isDirty}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium hover:border-primary/40 transition-colors disabled:opacity-40"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={openPanel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Open Panel
          </button>
        </div>
      </div>

      {/* Days */}
      <div className="space-y-4">
        {days.map((day) => (
          <div key={day.day} className="border rounded-2xl overflow-hidden">
            {/* Day header */}
            <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                  {day.day}
                </div>
                <span className="font-semibold text-sm">Day {day.day}</span>
                {day.stops.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    · {formatCurrency(day.stops.reduce((s, st) => s + st.cost_usd, 0))}
                  </span>
                )}
              </div>
              {days.length > 1 && (
                <button
                  onClick={() => removeDay(day.day)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
                  aria-label={`Remove Day ${day.day}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Stops */}
            {day.stops.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">No stops yet.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Visit a listing and tap &quot;Add to itinerary&quot; to add a stop here.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {day.stops.map((stop, i) => (
                  <div key={stop.id || i} className="flex items-start gap-3 px-4 py-3">
                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-snug">{stop.title}</p>
                      {stop.location_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {stop.location_name}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {stop.duration_hours && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {stop.duration_hours}h
                          </span>
                        )}
                        {stop.cost_usd > 0 && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> {formatCurrency(stop.cost_usd)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeStop(stop.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1 flex-shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center"
                      aria-label={`Remove ${stop.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Add day */}
        <button
          onClick={addDay}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed rounded-2xl text-sm text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Day
        </button>
      </div>

      {/* Sign-in nudge for anonymous users */}
      {isAnonymous && (
        <div className="mt-8 p-4 rounded-2xl bg-primary/5 border border-primary/20 text-sm">
          <p className="font-semibold mb-1">Sign in to save your itinerary</p>
          <p className="text-muted-foreground text-sm">
            Your draft is stored locally. Sign in and it will be saved to your account automatically.
          </p>
          <Link
            href="/login"
            className="inline-block mt-3 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Sign in
          </Link>
        </div>
      )}
    </div>
  );
}
