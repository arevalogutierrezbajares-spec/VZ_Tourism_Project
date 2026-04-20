'use client';

import { useEffect } from 'react';
import { useItineraryStore } from '@/stores/itinerary-store';
import { useAuthStore } from '@/stores/auth-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import { useRecentlyViewedStore } from '@/stores/recently-viewed-store';

export function StoreHydration() {
  useEffect(() => {
    try {
      useItineraryStore.persist.rehydrate();
    } catch {
      // If itinerary store data is corrupt, reset silently
    }
    try {
      useAuthStore.persist.rehydrate();
    } catch {
      // If auth store data is corrupt (e.g. expired session schema change), clear it
      useAuthStore.getState().setUser(null);
      useAuthStore.getState().setProfile(null);
      useAuthStore.getState().setLoading(false);
    }
    try {
      useFavoritesStore.persist.rehydrate();
    } catch {
      // If favorites store data is corrupt, reset silently
    }
    try {
      useRecentlyViewedStore.persist.rehydrate();
    } catch {
      // If recently viewed store data is corrupt, reset silently
    }
  }, []);
  return null;
}
