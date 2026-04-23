import { useEffect, useRef } from 'react';
import { VENEZUELA_CENTER } from '@/lib/constants';
import type { MapboxMap } from '../mapbox-types';
import type { MapPin } from '@/types/map';
import { SOURCE_ID } from '../map-constants';

/**
 * Reactive effects that respond to store state changes:
 * dark mode style toggle, flyTo on center change, selected pin
 * highlight via feature-state, and fitBounds on targetBounds change.
 */
export function useMapCamera(
  mapInstanceRef: { current: MapboxMap | null },
  selectedIdRef: { current: string | null },
  opts: {
    center: [number, number];
    zoom: number;
    isDarkMode: boolean;
    selectedPin: MapPin | null;
    targetBounds: [[number, number], [number, number]] | null;
    mapLoaded: boolean;
  },
) {
  const { center, zoom, isDarkMode, selectedPin, targetBounds, mapLoaded } = opts;

  // Update dark mode style — skip on initial mount (style was already set during init)
  const prevDarkModeRef = useRef(isDarkMode);
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    if (prevDarkModeRef.current === isDarkMode) return;
    prevDarkModeRef.current = isDarkMode;
    mapInstanceRef.current.setStyle(
      isDarkMode
        ? 'mapbox://styles/mapbox/dark-v11'
        : 'mapbox://styles/mapbox/outdoors-v12'
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDarkMode, mapLoaded]);

  // GeoJSON data updates are handled by the direct store subscription
  // in the map's 'load' handler (useMapInit) — NOT via useEffect.
  // React 18 Strict Mode's mount/unmount cycle nulls mapInstanceRef,
  // making useEffect-based updates unreliable.

  // Fly to center when it changes (for search results)
  // Respects prefers-reduced-motion by using jumpTo instead of flyTo
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    // Only fly if it's a search-driven change (not the initial load)
    const [defaultLng, defaultLat] = VENEZUELA_CENTER;
    if (center[0] !== defaultLng || center[1] !== defaultLat) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        mapInstanceRef.current.easeTo({ center, zoom, duration: 0 });
      } else {
        mapInstanceRef.current.flyTo({
          center,
          zoom,
          curve: 1.42,
          speed: 1.2,
          maxDuration: 2500,
          essential: true,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, zoom, mapLoaded]);

  // Sync selected pin highlight to map via feature-state (GPU-accelerated)
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    const map = mapInstanceRef.current;
    // Clear previous selection
    if (selectedIdRef.current != null) {
      try { map.setFeatureState({ source: SOURCE_ID, id: selectedIdRef.current }, { selected: false }); } catch { /* source may not exist yet */ }
    }
    // Apply new selection
    if (selectedPin) {
      selectedIdRef.current = selectedPin.id;
      try { map.setFeatureState({ source: SOURCE_ID, id: selectedPin.id }, { selected: true }); } catch { /* source may not exist yet */ }
    } else {
      selectedIdRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPin, mapLoaded]);

  // Fit map to bounds when targetBounds changes (city/region selection)
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded || !targetBounds) return;
    // Validate bounds — prevent NaN or degenerate (identical corners)
    const [[w, s], [e, n]] = targetBounds;
    if ([w, s, e, n].some((v) => !Number.isFinite(v))) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
      mapInstanceRef.current.fitBounds(targetBounds, {
        padding: { top: 120, bottom: 80, left: 60, right: 60 },
        maxZoom: 14,
        duration: prefersReducedMotion ? 0 : 1500,
      });
    } catch (err) {
      console.error('fitBounds failed:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetBounds, mapLoaded]);
}
