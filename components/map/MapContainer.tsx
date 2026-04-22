'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useMapStore } from '@/stores/map-store';
import { MapControls } from './MapControls';
import type { MapPin } from '@/types/map';
import { VENEZUELA_CENTER, VENEZUELA_DEFAULT_ZOOM } from '@/lib/constants';

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
  addImage?: (id: string, image: ImageData, opts?: { pixelRatio?: number; sdf?: boolean }) => void;
  hasImage?: (id: string) => boolean;
  flyTo: (opts: unknown) => void;
  easeTo: (opts: unknown) => void;
  fitBounds: (bounds: [[number, number], [number, number]], opts?: unknown) => void;
  setStyle: (style: string) => void;
  setFeatureState: (feature: { source: string; id: string | number }, state: Record<string, unknown>) => void;
  removeFeatureState: (feature: { source: string; id?: string | number }) => void;
  getCanvas: () => HTMLCanvasElement;
  resize: () => void;
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
  id?: string | number;
  geometry: { coordinates: [number, number] };
  properties: Record<string, unknown>;
};

type MapboxPopup = {
  setLngLat: (coords: [number, number]) => MapboxPopup;
  setHTML: (html: string) => MapboxPopup;
  setDOMContent: (el: HTMLElement) => MapboxPopup;
  addTo: (map: unknown) => MapboxPopup;
  remove: () => void;
};

const SOURCE_ID = 'listings-source';
const CLUSTER_LAYER = 'clusters';
const CLUSTER_COUNT_LAYER = 'cluster-count';
const POINT_LAYER = 'unclustered-point';
const GLOW_LAYER = 'pin-glow';

// ── Category color map (used by Mapbox expressions + tooltip) ──────────
const CATEGORY_COLORS: Record<string, string> = {
  accommodation: '#3B82F6',
  gastronomy:    '#F97316',
  restaurants:   '#F97316',
  adventure:     '#EF4444',
  cultural:      '#F59E0B',
  culture:       '#F59E0B',
  'eco-tours':   '#22C55E',
  beaches:       '#0EA5E9',
  wellness:      '#EC4899',
  mountains:     '#8B5CF6',
  cities:        '#3B82F6',  // scraped hotels — same color as accommodation
};
const DEFAULT_COLOR = '#6B7280';

/** Normalize category aliases to canonical BUSINESS_CATEGORIES keys */
function normalizeCategory(category: string | undefined): string {
  const cat = category ?? 'other';
  if (cat === 'restaurants') return 'gastronomy';
  if (cat === 'culture') return 'cultural';
  if (cat === 'cities') return 'accommodation';
  return cat;
}

/** Mapbox match expression: category → color (used by multiple layers) */
const CATEGORY_COLOR_EXPR = [
  'match', ['get', 'category'],
  'accommodation', '#3B82F6',
  'cities', '#3B82F6',         // scraped hotels — same as accommodation
  'gastronomy', '#F97316',
  'restaurants', '#F97316',
  'adventure', '#EF4444',
  'cultural', '#F59E0B',
  'culture', '#F59E0B',
  'eco-tours', '#22C55E',
  'beaches', '#0EA5E9',
  'wellness', '#EC4899',
  'mountains', '#8B5CF6',
  DEFAULT_COLOR,
];

function buildGeoJSON(pins: MapPin[], hiddenCategories: Set<string>) {
  return {
    type: 'FeatureCollection',
    features: pins
      .filter((pin) => !hiddenCategories.has(normalizeCategory(pin.category)))
      .map((pin) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [pin.lng, pin.lat] },
        properties: {
          id: pin.id,
          title: pin.title,
          slug: pin.slug ?? '',
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
  const hoveredIdRef = useRef<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const {
    center,
    zoom,
    pins,
    isDarkMode,
    is3DTerrain,
    hiddenCategories,
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

  // Add source + layers to the map (called after map load and after style changes)
  const addListingsLayers = useCallback(
    async (map: MapboxMap) => {
      // Guard against duplicate adds (styledata fires multiple times)
      if (map.getSource(SOURCE_ID)) return;

      const mapboxgl = (await import('mapbox-gl')).default;

      // Dim countries outside Venezuela
      // Read dark mode from store at call-time (not stale closure)
      const dark = useMapStore.getState().isDarkMode;
      if (!map.getSource('country-boundaries-source')) {
        map.addSource('country-boundaries-source', {
          type: 'vector',
          url: 'mapbox://mapbox.country-boundaries-v1',
        });
      }
      if (!map.getLayer('country-dim')) {
        map.addLayer({
          id: 'country-dim',
          type: 'fill',
          source: 'country-boundaries-source',
          'source-layer': 'country_boundaries',
          filter: ['!=', ['get', 'iso_3166_1'], 'VE'],
          paint: {
            'fill-color': dark ? '#000000' : '#e2e0db',
            'fill-opacity': dark ? 0.55 : 0.6,
          },
        });
      }
      if (!map.getLayer('venezuela-border')) {
        map.addLayer({
          id: 'venezuela-border',
          type: 'line',
          source: 'country-boundaries-source',
          'source-layer': 'country_boundaries',
          filter: ['==', ['get', 'iso_3166_1'], 'VE'],
          paint: {
            'line-color': dark ? '#ffffff' : '#334155',
            'line-width': 1.5,
            'line-opacity': 0.4,
          },
        });
      }

      // GeoJSON source with clustering
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: buildGeoJSON(useMapStore.getState().pins, useMapStore.getState().hiddenCategories),
        cluster: true,
        clusterMaxZoom: 10,
        clusterRadius: 50,
        promoteId: 'id',
      });

      // Cluster outer ring (soft halo behind cluster bubble)
      map.addLayer({
        id: 'cluster-ring',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step', ['get', 'point_count'],
            '#3B82F6', 50, '#2563EB', 200, '#1D4ED8',
          ],
          'circle-radius': ['step', ['get', 'point_count'], 24, 50, 32, 200, 40],
          'circle-opacity': 0.15,
        },
      });

      // Cluster bubbles
      map.addLayer({
        id: CLUSTER_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step', ['get', 'point_count'],
            '#3B82F6', 50, '#2563EB', 200, '#1D4ED8',
          ],
          'circle-radius': ['step', ['get', 'point_count'], 18, 50, 24, 200, 32],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.92,
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
          'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': ['step', ['get', 'point_count'], 13, 50, 15, 200, 17],
        },
        paint: { 'text-color': '#ffffff' },
      });

      // ── Pin layers (GPU-accelerated circles — crisp at any DPI) ──

      // Layer 1: Shadow beneath each pin
      map.addLayer({
        id: 'pin-shadow',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'],
            4, 5, 7, 7, 10, 9, 14, 12,
          ],
          'circle-color': '#000000',
          'circle-blur': 0.7,
          'circle-opacity': 0.2,
          'circle-translate': [0, 2],
        },
      });

      // Layer 2: Hover/selected glow ring (feature-state driven)
      map.addLayer({
        id: GLOW_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'],
            4, 12, 7, 16, 10, 20, 14, 26,
          ],
          'circle-blur': 0.5,
          'circle-color': CATEGORY_COLOR_EXPR,
          'circle-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 0.5,
            ['boolean', ['feature-state', 'hover'], false], 0.35,
            0,
          ],
          'circle-opacity-transition': { duration: 150, delay: 0 },
        },
      });

      // Layer 3: White border ring
      map.addLayer({
        id: 'pin-border',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'],
            4, 5.5, 7, 7.5, 10, 10, 14, 13,
          ],
          'circle-color': '#ffffff',
          'circle-opacity': 1,
        },
      });

      // Layer 4: Main colored circle (the pin itself)
      map.addLayer({
        id: POINT_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'],
            4, 4, 7, 6, 10, 8.5, 14, 11,
          ],
          'circle-color': CATEGORY_COLOR_EXPR,
          'circle-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 1,
            ['boolean', ['feature-state', 'hover'], false], 1,
            0.92,
          ],
          'circle-stroke-width': [
            'case',
            ['==', ['get', 'isVerified'], 1], 2,
            0,
          ],
          'circle-stroke-color': '#22C55E',
        },
      });

      // Layer 5: Small white inner dot (gives the pin a bullseye look)
      map.addLayer({
        id: 'pin-inner-dot',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'],
            4, 1.2, 7, 2, 10, 3, 14, 4,
          ],
          'circle-color': '#ffffff',
          'circle-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0, 7, 0.7, 10, 0.9],
        },
      });

      // Layer 6: Title labels (visible at zoom >= 12)
      map.addLayer({
        id: 'pin-labels',
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        minzoom: 11.5,
        layout: {
          'text-field': ['get', 'title'],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10, 16, 13],
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
          'text-max-width': 9,
          'text-optional': true,
          'symbol-sort-key': ['case', ['==', ['get', 'isVerified'], 1], 0, 1],
        },
        paint: {
          'text-color': dark ? '#e2e8f0' : '#1e293b',
          'text-halo-color': dark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.92)',
          'text-halo-width': 1.8,
          'text-opacity': ['interpolate', ['linear'], ['zoom'], 11.5, 0, 12, 1],
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

      // Click: cluster → smooth zoom to expansion level
      map.on('click', CLUSTER_LAYER, (e) => {
        if (!e.features?.length) return;
        const feature = e.features[0];
        const clusterId = feature.properties['cluster_id'] as number;
        const coordinates = feature.geometry.coordinates;
        const source = map.getSource(SOURCE_ID);
        if (!source) return;
        source.getClusterExpansionZoom(clusterId, (err, zoomLevel) => {
          if (err) return;
          const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          if (prefersReducedMotion) {
            map.easeTo({ center: coordinates, zoom: zoomLevel, duration: 0 });
          } else {
            map.flyTo({
              center: coordinates,
              zoom: zoomLevel,
              curve: 1.42,
              speed: 1.6,
              maxDuration: 1500,
              essential: true,
            });
          }
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

      // Click: individual point → preview card
      map.on('click', POINT_LAYER, handlePinLayerClick);

      // Cluster hover: cursor + tooltip showing count
      map.on('mouseenter', CLUSTER_LAYER, (e) => {
        map.getCanvas().style.cursor = 'pointer';
        if (!e.features?.length || !tooltipRef.current) return;
        const count = e.features[0].properties['point_count'] as number;
        const container = document.createElement('div');
        container.style.cssText = 'font-size:12px;font-weight:600;white-space:nowrap';
        container.textContent = `${count} listings — click to expand`;
        tooltipRef.current
          .setLngLat(e.features[0].geometry.coordinates as [number, number])
          .setDOMContent(container)
          .addTo(mapInstanceRef.current!);
      });
      map.on('mouseleave', CLUSTER_LAYER, () => {
        map.getCanvas().style.cursor = '';
        tooltipRef.current?.remove();
      });

      // Hover tooltip + GPU-accelerated highlight via feature-state
      function handlePinMouseEnter(e: MapboxEvent) {
        map.getCanvas().style.cursor = 'pointer';
        if (!e.features?.length) return;

        // Set feature-state for hover highlight (GPU-accelerated, no repaint)
        const featureId = e.features[0].id != null ? String(e.features[0].id) : null;
        if (featureId && hoveredIdRef.current !== featureId) {
          if (hoveredIdRef.current != null) {
            try { map.setFeatureState({ source: SOURCE_ID, id: hoveredIdRef.current }, { hover: false }); } catch { /* source may not exist */ }
          }
          hoveredIdRef.current = featureId;
          try { map.setFeatureState({ source: SOURCE_ID, id: featureId }, { hover: true }); } catch { /* source may not exist */ }
        }

        if (!tooltipRef.current) return;
        const { title, city, region, category, rating } = e.features[0].properties as {
          title: string;
          city: string;
          region: string;
          category: string;
          rating: number | null;
        };
        const subtitle = [city, region].filter(Boolean).join(', ');
        const catColor = CATEGORY_COLORS[category] ?? DEFAULT_COLOR;

        // Build tooltip DOM (avoids XSS via setHTML)
        const container = document.createElement('div');
        container.style.cssText = 'display:flex;align-items:flex-start;gap:8px';

        // Color dot
        const dot = document.createElement('span');
        dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${catColor};flex-shrink:0;margin-top:4px`;
        container.appendChild(dot);

        const textWrap = document.createElement('div');
        const titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-size:13px;font-weight:600;white-space:nowrap;max-width:200px;overflow:hidden;text-overflow:ellipsis';
        titleEl.textContent = title;
        textWrap.appendChild(titleEl);

        if (subtitle || (rating != null && rating > 0)) {
          const metaEl = document.createElement('div');
          metaEl.style.cssText = 'font-size:11px;color:#6B7280;margin-top:1px;display:flex;align-items:center;gap:4px';
          if (rating != null && rating > 0) {
            const starSpan = document.createElement('span');
            starSpan.textContent = `★ ${rating.toFixed(1)}`;
            starSpan.style.cssText = 'color:#F59E0B;font-weight:600';
            metaEl.appendChild(starSpan);
            if (subtitle) {
              const sep = document.createElement('span');
              sep.textContent = '·';
              sep.style.color = '#D1D5DB';
              metaEl.appendChild(sep);
            }
          }
          if (subtitle) {
            const locSpan = document.createElement('span');
            locSpan.textContent = subtitle;
            metaEl.appendChild(locSpan);
          }
          textWrap.appendChild(metaEl);
        }
        container.appendChild(textWrap);
      tooltipRef.current
          .setLngLat([e.lngLat.lng, e.lngLat.lat])
          .setDOMContent(container)
          .addTo(mapInstanceRef.current!);
      }
      function handlePinMouseLeave() {
        map.getCanvas().style.cursor = '';
        if (hoveredIdRef.current != null) {
          try { map.setFeatureState({ source: SOURCE_ID, id: hoveredIdRef.current }, { hover: false }); } catch { /* source may not exist */ }
          hoveredIdRef.current = null;
        }
        tooltipRef.current?.remove();
      }

      map.on('mouseenter', POINT_LAYER, handlePinMouseEnter);
      map.on('mouseleave', POINT_LAYER, handlePinMouseLeave);
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
        zoom: VENEZUELA_DEFAULT_ZOOM,
        bearing: 0,
        pitch: 0,
        interactive,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        // Restrict panning to Venezuela + surrounding waters
        maxBounds: [
          [-76, 0.5],   // SW corner (west of Zulia, south of Amazonas)
          [-58, 16],     // NE corner (east of Delta Amacuro, north of Los Roques)
        ],
        minZoom: 4.5,
        maxZoom: 18,
      });

      mapInstanceRef.current = map;

      // Observe container resize so map redraws correctly (e.g. when side panels open/close)
      resizeObserverRef.current = new ResizeObserver(() => {
        map.resize();
      });
      resizeObserverRef.current.observe(mapRef.current!);

      // WebGL context loss recovery — prevents silent blank map
      const mapCanvas = map.getCanvas();
      mapCanvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        setMapError('Map display interrupted — restoring...');
      });
      mapCanvas.addEventListener('webglcontextrestored', () => {
        setMapError(null);
      });

      // Disable rotation on touch (keep pinch-zoom enabled)
      (map as unknown as { touchZoomRotate: { disableRotation: () => void } }).touchZoomRotate.disableRotation();

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
          mapboxgl as { NavigationControl: new (opts?: unknown) => unknown }
        ).NavigationControl;
        map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');

        try {
          await addListingsLayers(map);
        } catch (err) {
          console.error('Failed to add map layers on load:', err);
        }
        initialLoadDone = true;
        setMapLoaded(true);
      });

      map.on('error', ((_e: unknown) => {
        // Only treat as fatal if it's an authentication or WebGL error during initial load
        // Non-fatal errors (missing tiles, sprite 404s) should not block the map
        const e = _e as { error?: { message?: string } };
        const msg = e?.error?.message ?? '';
        const isFatal = msg.includes('access token') || msg.includes('WebGL');
        if (!initialLoadDone && isFatal) {
          clearTimeout(loadTimeout);
          setMapError('Map failed to load');
          setMapLoaded(true);
        }
      }) as () => void);

      // Re-add layers only after style CHANGES (dark mode toggle), not during initial load
      // Style changes clear all feature state, so re-apply selected pin state
      map.on('styledata', () => {
        if (!initialLoadDone) return;
        addListingsLayers(map).then(() => {
          // Re-apply selected state (style change clears all feature-state)
          if (selectedIdRef.current != null) {
            try { map.setFeatureState({ source: SOURCE_ID, id: selectedIdRef.current }, { selected: true }); } catch {}
          }
        }).catch(console.error);
      });
    }

    initMap().catch((err) => {
      console.error('Map init error:', err);
      setMapError('Map failed to initialize');
      setMapLoaded(true);
    });

    return () => {
      resizeObserverRef.current?.disconnect();
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
    const geo = buildGeoJSON(pins, hiddenCategories);
    source.setData(geo);
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
  }, [selectedPin, mapLoaded]);

  // Fit map to bounds when targetBounds changes (city/region selection)
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded || !targetBounds) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    mapInstanceRef.current.fitBounds(targetBounds, {
      padding: { top: 120, bottom: 80, left: 60, right: 60 },
      maxZoom: 14,
      duration: prefersReducedMotion ? 0 : 1500,
    });
  }, [targetBounds, mapLoaded]);

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
