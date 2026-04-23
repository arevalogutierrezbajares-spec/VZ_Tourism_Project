'use client';

import { useRef, useCallback } from 'react';
import { useMapStore } from '@/stores/map-store';
import { MapControls } from './MapControls';
import type { MapPin } from '@/types/map';
import type { MapboxMap, MapboxPopup } from './mapbox-types';
import { useMapLayers } from './hooks/useMapLayers';
import { useMapInit } from './hooks/useMapInit';
import { useMapCamera } from './hooks/useMapCamera';

interface MapContainerProps {
  className?: string;
  interactive?: boolean;
  showControls?: boolean;
  onPinClick?: (pin: MapPin) => void;
}

export function MapContainer({
  className = 'w-full h-full',
  interactive = true,
  showControls = true,
  onPinClick,
}: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapboxMap | null>(null);
  const tooltipRef = useRef<MapboxPopup | null>(null);
  const hoveredIdRef = useRef<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);

  const {
    center,
    zoom,
    isDarkMode,
    selectedPin,
    setSelectedPin,
    targetBounds,
  } = useMapStore();

  const handlePinClick = useCallback(
    (pin: MapPin) => {
      setSelectedPin(pin);
      onPinClick?.(pin);
    },
    [setSelectedPin, onPinClick]
  );

  const addListingsLayers = useMapLayers(tooltipRef, hoveredIdRef, handlePinClick);

  const { mapLoaded, mapError } = useMapInit(
    mapRef, mapInstanceRef, selectedIdRef, addListingsLayers,
    { isDarkMode, interactive },
  );

  useMapCamera(mapInstanceRef, selectedIdRef, {
    center, zoom, isDarkMode, selectedPin, targetBounds, mapLoaded,
  });

  return (
    <div className={`relative ${className}`} role="region" aria-label="Interactive map">
      <div
        ref={mapRef}
        className="w-full h-full"
        aria-label="Map display — use mouse to interact with pins, press Escape to deselect"
        tabIndex={interactive ? 0 : -1}
      />

      {/* Screen reader announcements for pin interactions */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {selectedPin ? `Selected: ${selectedPin.title}` : ''}
      </div>

      {/* Loading skeleton */}
      {!mapLoaded && !mapError && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-muted"
          role="status"
          aria-live="polite"
        >
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {mapError && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sky-100 to-blue-200 dark:from-sky-900 dark:to-blue-900 z-10"
          role="alert"
        >
          <div className="text-center space-y-3 p-6">
            <div className="text-4xl" aria-hidden="true">🗺️</div>
            <h3 className="font-semibold text-lg">Map unavailable</h3>
            <p className="text-sm text-muted-foreground max-w-xs">{mapError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-[background-color] duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Missing token fallback */}
      {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sky-100 to-blue-200 dark:from-sky-900 dark:to-blue-900">
          <div className="text-center space-y-2 p-6">
            <div className="text-4xl" aria-hidden="true">🗺️</div>
            <h3 className="font-semibold text-lg">Map Preview</h3>
            <p className="text-sm text-muted-foreground">
              Configure NEXT_PUBLIC_MAPBOX_TOKEN to enable the interactive map
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div className="p-2 bg-background/50 rounded">Los Roques</div>
              <div className="p-2 bg-background/50 rounded">Merida</div>
              <div className="p-2 bg-background/50 rounded">Margarita</div>
            </div>
          </div>
        </div>
      )}

      {showControls && mapLoaded && <MapControls />}
    </div>
  );
}
