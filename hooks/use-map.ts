'use client';

import { useCallback } from 'react';
import { useMapStore } from '@/stores/map-store';
import type { Listing, SafetyZone } from '@/types/database';
import type { MapPin } from '@/types/map';
import { getCategoryColor } from '@/lib/mapbox/helpers';

export function useMap() {
  const store = useMapStore();

  const flyTo = useCallback(
    (lat: number, lng: number, zoom?: number) => {
      store.setCenter([lng, lat]);
      if (zoom) store.setZoom(zoom);
    },
    [store]
  );

  const loadListingsAsPins = useCallback(
    (listings: Listing[]) => {
      const pins: MapPin[] = listings.map((listing) => ({
        id: listing.id,
        lat: listing.latitude,
        lng: listing.longitude,
        title: listing.title,
        price: listing.price_usd,
        currency: 'USD',
        category: listing.category,
        rating: listing.rating,
        imageUrl: listing.cover_image_url ?? undefined,
        listingId: listing.id,
        isSelected: false,
      }));
      store.setPins(pins);
    },
    [store]
  );

  const selectListing = useCallback(
    (listing: Listing) => {
      const pin = store.pins.find((p) => p.listingId === listing.id);
      if (pin) {
        store.setSelectedPin(pin);
        flyTo(listing.latitude, listing.longitude, 13);
      }
    },
    [store, flyTo]
  );

  const loadSafetyZones = useCallback(
    (zones: SafetyZone[]) => {
      store.setSafetyZones(zones);
    },
    [store]
  );

  const getPinColor = useCallback((pin: MapPin): string => {
    return pin.category ? getCategoryColor(pin.category) : '#0EA5E9';
  }, []);

  return {
    ...store,
    flyTo,
    loadListingsAsPins,
    selectListing,
    loadSafetyZones,
    getPinColor,
  };
}
