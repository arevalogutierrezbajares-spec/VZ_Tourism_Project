'use client';

import { useEffect } from 'react';
import { useItineraryStore } from '@/stores/itinerary-store';
import { useAuthStore } from '@/stores/auth-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import { useRecentlyViewedStore } from '@/stores/recently-viewed-store';

export function StoreHydration() {
  useEffect(() => {
    useItineraryStore.persist.rehydrate();
    useAuthStore.persist.rehydrate();
    useFavoritesStore.persist.rehydrate();
    useRecentlyViewedStore.persist.rehydrate();
  }, []);
  return null;
}
