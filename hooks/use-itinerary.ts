'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useItineraryStore } from '@/stores/itinerary-store';
import type { Itinerary } from '@/types/database';
import toast from 'react-hot-toast';

export function useItinerary() {
  const store = useItineraryStore();
  const [isCreating, setIsCreating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-save every 30 seconds when there are unsaved changes
  useEffect(() => {
    if (saveTimerRef.current) clearInterval(saveTimerRef.current);

    if (store.isOpen && store.current) {
      saveTimerRef.current = setInterval(() => {
        if (store.isDirty && !store.isSaving) {
          store.save().catch(() => {
            // silent fail for auto-save
          });
        }
      }, 30_000);
    }

    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    };
  }, [store.isOpen, store.current?.id, store.isDirty, store.isSaving]);

  const createNew = useCallback(
    async (title = 'My Venezuela Adventure') => {
      setIsCreating(true);
      try {
        const response = await fetch('/api/itineraries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            is_public: false,
            tags: [],
          }),
        });

        if (!response.ok) throw new Error('Failed to create itinerary');

        const { data } = await response.json();
        store.setItinerary(data as Itinerary);
        store.openPanel();
        toast.success('Itinerary created!');
        return data;
      } catch (error) {
        toast.error('Failed to create itinerary');
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    [store]
  );

  const loadItinerary = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/itineraries/${id}`);
        if (!response.ok) throw new Error('Itinerary not found');
        const { data } = await response.json();
        store.setItinerary(data as Itinerary);
        return data;
      } catch (error) {
        toast.error('Failed to load itinerary');
        throw error;
      }
    },
    [store]
  );

  const shareItinerary = useCallback(async () => {
    const { current } = store;
    if (!current) return;

    try {
      await fetch(`/api/itineraries/${current.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: true }),
      });

      const shareUrl = `${window.location.origin}/itinerary/${current.id}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard!');
    } catch {
      toast.error('Failed to share itinerary');
    }
  }, [store]);

  const saveWithFeedback = useCallback(async () => {
    try {
      await store.save();
      toast.success('Itinerary saved!');
    } catch {
      toast.error('Failed to save itinerary');
    }
  }, [store]);

  const optimizeItinerary = useCallback(async () => {
    const { current, days } = store;
    if (!current || days.length === 0) return;

    setIsOptimizing(true);
    try {
      const response = await fetch('/api/ai/optimize-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itinerary_id: current.id,
          days: days.map((d) => ({
            day: d.day,
            stops: d.stops.map((s) => ({
              id: s.id,
              title: s.title,
              latitude: s.latitude,
              longitude: s.longitude,
              duration_hours: s.duration_hours,
            })),
          })),
        }),
      });

      if (!response.ok) throw new Error('Optimization failed');

      const data = await response.json();
      const message = data.optimization || data.suggestions || 'Itinerary optimized! Review the updated order.';
      toast.success(typeof message === 'string' && message.length > 100
        ? 'Optimization complete! Check the suggestions.'
        : message);
    } catch {
      toast.error('Could not optimize itinerary. Please try again.');
    } finally {
      setIsOptimizing(false);
    }
  }, [store]);

  const addListingToItinerary = useCallback(
    async (listing: {
      id: string;
      title: string;
      price_usd: number;
      latitude?: number | null;
      longitude?: number | null;
      location_name?: string | null;
      duration_hours?: number | null;
      short_description?: string | null;
    }) => {
      let currentItinerary = store.current;

      if (!currentItinerary) {
        // Auto-create an itinerary
        try {
          const created = await createNew('My Venezuela Adventure');
          currentItinerary = created;
        } catch {
          return;
        }
      }

      if (!currentItinerary) return;

      const targetDay = store.days[0]?.day ?? 1;
      const existingStops = store.days.find((d) => d.day === targetDay)?.stops ?? [];

      store.addStop({
        itinerary_id: currentItinerary.id,
        listing_id: listing.id,
        day: targetDay,
        order: existingStops.length,
        title: listing.title,
        description: listing.short_description ?? null,
        latitude: listing.latitude ?? null,
        longitude: listing.longitude ?? null,
        location_name: listing.location_name ?? null,
        cost_usd: listing.price_usd,
        duration_hours: listing.duration_hours ?? null,
        start_time: null,
        end_time: null,
        transport_to_next: null,
        transport_duration_minutes: null,
        notes: null,
      });

      store.openPanel();
      toast.success(`"${listing.title}" added to Day ${targetDay}`);
    },
    [store, createNew]
  );

  return {
    ...store,
    isCreating,
    isOptimizing,
    createNew,
    loadItinerary,
    shareItinerary,
    save: saveWithFeedback,
    optimizeItinerary,
    addListingToItinerary,
  };
}
