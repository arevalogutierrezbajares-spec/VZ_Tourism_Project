'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useMapStore } from '@/stores/map-store';
import { PinPreviewCard } from './PinPreviewCard';
import { MapLegend } from './MapLegend';
import { MapControls } from './MapControls';
import type { MapPin } from '@/types/map';
import { VENEZUELA_CENTER } from '@/lib/constants';

interface MapContainerProps {
  className?: string;
  interactive?: boolean;
  showControls?: boolean;
  onPinClick?: (pin: MapPin) => void;
}

type MapboxMap = {
  on: (event: string, layerOrCb: string | (() => void), cb?: (e: MapboxEvent) => void) => void;
  off: (event: string, layerOrCb: string | (() => void), cb?: (e: MapboxEvent) => void) => void;
  addControl: (ctrl: unknown, pos?: string) => void;
  addSource: (id: string, opts: unknown) => void;
  getSource: (id: string) => MapboxSource | undefined;
  addLayer: (opts: unknown) => void;
  getLayer: (id: string) => unknown;
  removeLayer: (id: string) => void;
  removeSource: (id: string) => void;
  flyTo: (opts: unknown) => void;
  easeTo: (opts: unknown) => void;
  setStyle: (style: string) => void;
  getCanvas: () => HTMLCanvasElement;
  remove: () => void;
  queryRenderedFeatures: (point: unknown, opts: unknown) => MapboxFeature[];
};

type MapboxSource = {
  setData: (data: unknown) => void;
  getClusterExpansionZoom: (clusterId: number, cb: (err: Error | null, zoom: number) => void) => void;
};

type MapboxEvent = {
  lngLat: { lng: number; lat: number };
  features?: MapboxFeature[];
  point: unknown;
};

type MapboxFeature = {
  geometry: { coordinates: [number, number] };
  properties: Record<string, unknown>;
};

type MapboxPopup = {
  setLngLat: (coords: [number, number]) => MapboxPopup;
  setHTML: (html: string) => MapboxPopup;
  addTo: (map: unknown) => MapboxPopup;
  remove: () => void;
};

const SOURCE_ID = 'listings-source';
const CLUSTER_LAYER = 'clusters';
const CLUSTER_COUNT_LAYER = 'cluster-count';
const POINT_LAYER = 'unclustered-point';
const VERIFIED_RING_LAYER = 'verified-ring';
const VERIFIED_CHECK_LAYER = 'verified-check';

function buildGeoJSON(pins: MapPin[], hiddenCategories: Set<string>) {
  return {
    type: 'FeatureCollection',
    features: pins
      .filter((pin) => !hiddenCategories.has(pin.category ?? 'other'))
      .map((pin) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [pin.lng, pin.lat] },
        properties: {
          id: pin.id,
          title: pin.title,
          category: pin.category ?? 'other',
          rating: pin.rating ?? null,
          reviewCount: pin.reviewCount ?? 0,
          city: pin.city ?? '',
          region: pin.region ?? '',
          listingId: pin.listingId ?? null,
          isVerified: pin.isVerified ? 1 : 0,
          pinJson: JSON.stringify(pin),
        },
      })),
  };
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
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);

  const {
    center,
    zoom,
    pins,
    isDarkMode,
    is3DTerrain,
    hiddenCategories,
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

  // Add source + layers to the map (called after map load and after style changes)
  const addListingsLayers = useCallback(
    async (map: MapboxMap) => {
      // Guard against duplicate adds (styledata fires multiple times)
      if (map.getSource(SOURCE_ID)) return;

      const mapboxgl = (await import('mapbox-gl')).default;

      // GeoJSON source with clustering
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: buildGeoJSON(pins, hiddenCategories),
        cluster: true,
        clusterMaxZoom: 10,
        clusterRadius: 50,
      });

      // Cluster bubbles
      map.addLayer({
        id: CLUSTER_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#60A5FA',
            50,
            '#3B82F6',
            200,
            '#1D4ED8',
          ],
          'circle-radius': ['step', ['get', 'point_count'], 18, 50, 24, 200, 32],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9,
        },
      });

      // Cluster count label
      map.addLayer({
        id: CLUSTER_COUNT_LAYER,
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12,
        },
        paint: { 'text-color': '#ffffff' },
      });

      // Individual pins — radius 8 (visible)
      map.addLayer({
        id: POINT_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'match',
            ['get', 'category'],
            'accommodation', '#3B82F6',
            'gastronomy', '#F97316',
            'adventure', '#EF4444',
            'cities', '#8B5CF6',
            'beaches', '#0EA5E9',
            'eco-tours', '#22C55E',
            'mountains', '#8B5CF6',
            'cultural', '#F59E0B',
            'wellness', '#EC4899',
            /* default */ '#6B7280',
          ],
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9,
        },
      });

      // Transparent 44px hit-area circle added AFTER the visible pin layer so it sits on top
      // and captures touch/click events within a 44px touch target (WCAG 2.5.5 minimum)
      map.addLayer({
        id: 'listing-pins-hitarea',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 22,
          'circle-opacity': 0,
          'circle-color': 'transparent',
        },
      });

      // Verified ring: white border glow around verified pins
      map.addLayer({
        id: VERIFIED_RING_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'isVerified'], 1]],
        paint: {
          'circle-color': 'transparent',
          'circle-radius': 10,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0,
          'circle-stroke-opacity': 1,
        },
      });

      // Verified check label: ✓ symbol on verified pins
      map.addLayer({
        id: VERIFIED_CHECK_LAYER,
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'isVerified'], 1]],
        layout: {
          'text-field': '✓',
          'text-size': 8,
          'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
          'text-offset': [0, 0],
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.2)',
          'text-halo-width': 0.5,
        },
      });

      // Hover tooltip
      const Popup = (mapboxgl as { Popup: new (opts: unknown) => MapboxPopup }).Popup;
      tooltipRef.current = new Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 10,
        className: 'map-tooltip',
      });

      // Click: cluster → zoom in (respects prefers-reduced-motion)
      map.on('click', CLUSTER_LAYER, (e) => {
        if (!e.features?.length) return;
        const clusterId = e.features[0].properties['cluster_id'] as number;
        const source = map.getSource(SOURCE_ID);
        if (!source) return;
        source.getClusterExpansionZoom(clusterId, (err, zoomLevel) => {
          if (err) return;
          const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          map.easeTo({
            center: e.features![0].geometry.coordinates,
            zoom: zoomLevel,
            duration: prefersReducedMotion ? 0 : 500,
          });
        });
      });

      // Shared handler for pin click (used by both the visible layer and the transparent hitarea)
      function handlePinLayerClick(e: MapboxEvent) {
        if (!e.features?.length) return;
        const raw = e.features[0].properties['pinJson'] as string;
        try {
          const pin = JSON.parse(raw) as MapPin;
          handlePinClick(pin);
        } catch {
          // ignore
        }
      }

      // Click: individual point → preview card (both visible pin and expanded hit-area)
      map.on('click', POINT_LAYER, handlePinLayerClick);
      map.on('click', 'listing-pins-hitarea', handlePinLayerClick);

      // Cursor changes
      map.on('mouseenter', CLUSTER_LAYER, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', CLUSTER_LAYER, () => {
        map.getCanvas().style.cursor = '';
      });

      // Hover tooltip on individual pins (also triggered by the hitarea's expanded radius)
      function handlePinMouseEnter(e: MapboxEvent) {
        map.getCanvas().style.cursor = 'pointer';
        if (!e.features?.length || !tooltipRef.current) return;
        const { title, city, region } = e.features[0].properties as {
          title: string;
          city: string;
          region: string;
        };
        const subtitle = [city, region].filter(Boolean).join(', ');
        tooltipRef.current
          .setLngLat([e.lngLat.lng, e.lngLat.lat])
          .setHTML(
            `<div style="font-size:13px;font-weight:600;white-space:nowrap">${title}</div>${
              subtitle
                ? `<div style="font-size:11px;color:#6B7280;margin-top:2px">${subtitle}</div>`
                : ''
            }`
          )
          .addTo(mapInstanceRef.current!);
      }
      function handlePinMouseLeave() {
        map.getCanvas().style.cursor = '';
        tooltipRef.current?.remove();
      }

      map.on('mouseenter', POINT_LAYER, handlePinMouseEnter);
      map.on('mouseleave', POINT_LAYER, handlePinMouseLeave);
      map.on('mouseenter', 'listing-pins-hitarea', handlePinMouseEnter);
      map.on('mouseleave', 'listing-pins-hitarea', handlePinMouseLeave);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setMapError('Mapbox token not configured');
      setMapLoaded(true);
      return;
    }

    let map: MapboxMap;
    // Track whether the initial load has completed, for styledata re-adds
    let initialLoadDone = false;

    async function initMap() {
      const mapboxgl = (await import('mapbox-gl')).default;
      await import('mapbox-gl/dist/mapbox-gl.css');

      (mapboxgl as { accessToken: string }).accessToken = token!;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map = new (mapboxgl as unknown as { Map: new (opts: unknown) => MapboxMap }).Map({
        container: mapRef.current!,
        style: isDarkMode
          ? 'mapbox://styles/mapbox/dark-v11'
          : 'mapbox://styles/mapbox/outdoors-v12',
        center: VENEZUELA_CENTER,
        zoom: 7,
        bearing: 0,
        pitch: 0,
        interactive,
      });

      mapInstanceRef.current = map;

      const loadTimeout = setTimeout(() => {
        if (!initialLoadDone) {
          setMapError('Map took too long to load. Check your connection and try again.');
          setMapLoaded(true);
        }
      }, 10000);

      map.on('load', async () => {
        clearTimeout(loadTimeout);
        // Add nav controls
        const NavigationControl = (
          mapboxgl as { NavigationControl: new () => unknown }
        ).NavigationControl;
        map.addControl(new NavigationControl(), 'bottom-right');

        try {
          await addListingsLayers(map);
        } catch (err) {
          console.error('Failed to add map layers on load:', err);
        }
        initialLoadDone = true;
        setMapLoaded(true);
      });

      map.on('error', () => {
        clearTimeout(loadTimeout);
        if (!initialLoadDone) {
          setMapError('Map failed to load');
          setMapLoaded(true);
        }
      });

      // Re-add layers only after style CHANGES (dark mode toggle), not during initial load
      map.on('styledata', () => {
        if (!initialLoadDone) return;
        addListingsLayers(map).catch(console.error);
      });
    }

    initMap().catch((err) => {
      console.error('Map init error:', err);
      setMapError('Map failed to initialize');
      setMapLoaded(true);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update dark mode style
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    mapInstanceRef.current.setStyle(
      isDarkMode
        ? 'mapbox://styles/mapbox/dark-v11'
        : 'mapbox://styles/mapbox/outdoors-v12'
    );
  }, [isDarkMode, mapLoaded]);

  // Update GeoJSON data when pins or hidden categories change
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    const source = mapInstanceRef.current.getSource(SOURCE_ID);
    if (!source) return;
    source.setData(buildGeoJSON(pins, hiddenCategories));
  }, [pins, hiddenCategories, mapLoaded]);

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
        mapInstanceRef.current.flyTo({ center, zoom });
      }
    }
  }, [center, zoom, mapLoaded]);

  return (
    <div className={`relative ${className}`} role="region" aria-label="Interactive map">
      <div
        ref={mapRef}
        className="w-full h-full"
        aria-label="Map display"
        tabIndex={interactive ? 0 : -1}
      />

      {/* Loading skeleton */}
      {!mapLoaded && !mapError && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900"
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
              <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded">Los Roques</div>
              <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded">Merida</div>
              <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded">Margarita</div>
            </div>
          </div>
        </div>
      )}

      {showControls && mapLoaded && <MapControls />}

      {/* Category legend */}
      {mapLoaded && (
        <div className="absolute bottom-24 left-4 z-10">
          <MapLegend pins={pins} />
        </div>
      )}

      {/* Pin preview card */}
      <AnimatePresence initial={false}>
        {selectedPin && (
          <div className="absolute bottom-24 right-4 z-10">
            <PinPreviewCard
              pin={selectedPin}
              onClose={() => {
                setSelectedPin(null);
                storeSetSelectedPin(null);
              }}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
