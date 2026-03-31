'use client';

import { useCallback, useState } from 'react';
import { useItineraryStore } from '@/stores/itinerary-store';
import { createClient } from '@/lib/supabase/client';
import type { Itinerary } from '@/types/database';
import toast from 'react-hot-toast';

export function useItinerary() {
  const store = useItineraryStore();
  const [isCreating, setIsCreating] = useState(false);

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

  return {
    ...store,
    isCreating,
    createNew,
    loadItinerary,
    shareItinerary,
    save: saveWithFeedback,
  };
}
