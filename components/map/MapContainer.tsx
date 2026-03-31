'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useMapStore } from '@/stores/map-store';
import { PinPreviewCard } from './PinPreviewCard';
import { MapControls } from './MapControls';
import type { MapPin } from '@/types/map';
import { getCategoryColor } from '@/lib/mapbox/helpers';
import { VENEZUELA_CENTER, VENEZUELA_DEFAULT_ZOOM } from '@/lib/constants';

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
  const mapInstanceRef = useRef<unknown>(null);
  const markersRef = useRef<Map<string, unknown>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);

  const {
    center,
    zoom,
    pins,
    isDarkMode,
    is3DTerrain,
    showSafetyZones,
    safetyZones,
    setSelectedPin: storeSetSelectedPin,
  } = useMapStore();

  const handlePinClick = useCallback(
    (pin: MapPin) => {
      setSelectedPin(pin);
      storeSetSelectedPin(pin);
      onPinClick?.(pin);
    },
    [storeSetSelectedPin, onPinClick]
  );

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.warn('Mapbox token not configured');
      return;
    }

    let map: unknown;

    async function initMap() {
      const mapboxgl = (await import('mapbox-gl')).default;
      await import('mapbox-gl/dist/mapbox-gl.css');

      (mapboxgl as { accessToken: string }).accessToken = token!;

      map = new (mapboxgl as { Map: new (opts: unknown) => unknown }).Map({
        container: mapRef.current!,
        style: isDarkMode
          ? 'mapbox://styles/mapbox/dark-v11'
          : 'mapbox://styles/mapbox/outdoors-v12',
        center: center,
        zoom: zoom,
        bearing: 0,
        pitch: 0,
        interactive,
      });

      const mapInstance = map as {
        on: (event: string, cb: () => void) => void;
        addControl: (ctrl: unknown, pos?: string) => void;
        addSource: (id: string, opts: unknown) => void;
        addLayer: (opts: unknown) => void;
        flyTo: (opts: unknown) => void;
        remove: () => void;
      };

      mapInstance.on('load', () => {
        setMapLoaded(true);

        // Add terrain if 3D mode
        if (is3DTerrain) {
          mapInstance.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
          });
        }

        // Add navigation controls
        const NavigationControl = (mapboxgl as { NavigationControl: new () => unknown }).NavigationControl;
        mapInstance.addControl(new NavigationControl(), 'bottom-right');
      });

      mapInstanceRef.current = map;
    }

    initMap().catch(console.error);

    return () => {
      if (map) {
        (map as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update map style when dark mode changes
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    const mapInstance = mapInstanceRef.current as { setStyle: (s: string) => void };
    mapInstance.setStyle(
      isDarkMode
        ? 'mapbox://styles/mapbox/dark-v11'
        : 'mapbox://styles/mapbox/outdoors-v12'
    );
  }, [isDarkMode, mapLoaded]);

  // Update pins/markers
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    async function updateMarkers() {
      const mapboxgl = (await import('mapbox-gl')).default;
      const mapInstance = mapInstanceRef.current as {
        getCenter: () => { lng: number; lat: number };
      };

      // Remove old markers
      markersRef.current.forEach((marker) => {
        (marker as { remove: () => void }).remove();
      });
      markersRef.current.clear();

      // Add new markers
      pins.forEach((pin) => {
        const el = document.createElement('div');
        const color = getCategoryColor(pin.category || '');
        el.className = 'map-pin-marker cursor-pointer';
        el.style.cssText = `
          width: 40px;
          height: 40px;
          border-radius: 50% 50% 50% 0;
          background: ${pin.isSelected ? '#F59E0B' : color};
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        `;

        if (pin.price) {
          const priceEl = document.createElement('div');
          priceEl.style.cssText = `
            transform: rotate(45deg);
            font-size: 10px;
            font-weight: 700;
            color: white;
            text-shadow: 0 1px 2px rgba(0,0,0,0.4);
          `;
          priceEl.textContent = `$${pin.price}`;
          el.appendChild(priceEl);
        }

        el.addEventListener('click', () => handlePinClick(pin));

        type MarkerInstance = { setLngLat: (coords: [number, number]) => MarkerInstance; addTo: (map: unknown) => MarkerInstance };
        const Marker = (mapboxgl as { Marker: new (opts: { element: HTMLElement }) => MarkerInstance }).Marker;
        const marker = new Marker({ element: el })
          .setLngLat([pin.lng, pin.lat]);

        marker.addTo(mapInstanceRef.current!);
        markersRef.current.set(pin.id, marker);
      });
    }

    updateMarkers().catch(console.error);
  }, [pins, mapLoaded, handlePinClick]);

  // Fly to center when it changes
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    const mapInstance = mapInstanceRef.current as {
      flyTo: (opts: { center: [number, number]; zoom: number }) => void;
    };
    mapInstance.flyTo({ center, zoom });
  }, [center, zoom, mapLoaded]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="w-full h-full" />

      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sky-100 to-blue-200 dark:from-sky-900 dark:to-blue-900">
          <div className="text-center space-y-2 p-6">
            <div className="text-4xl">🗺️</div>
            <h3 className="font-semibold text-lg">Map Preview</h3>
            <p className="text-sm text-muted-foreground">
              Configure NEXT_PUBLIC_MAPBOX_TOKEN to enable the interactive map
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div className="p-2 bg-white/50 rounded">📍 Los Roques</div>
              <div className="p-2 bg-white/50 rounded">⛰️ Mérida</div>
              <div className="p-2 bg-white/50 rounded">🏝️ Margarita</div>
            </div>
          </div>
        </div>
      )}

      {showControls && mapLoaded && <MapControls />}

      {selectedPin && (
        <div className="absolute bottom-24 left-4 z-10">
          <PinPreviewCard
            pin={selectedPin}
            onClose={() => {
              setSelectedPin(null);
              storeSetSelectedPin(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
