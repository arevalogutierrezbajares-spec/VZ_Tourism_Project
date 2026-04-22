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
  addImage: (id: string, image: ImageData, opts?: { pixelRatio?: number; sdf?: boolean }) => void;
  hasImage: (id: string) => boolean;
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

// Google Maps-style category markers
const CATEGORY_MARKERS: Record<string, { color: string; label: string }> = {
  accommodation: { color: '#3B82F6', label: 'H' },
  gastronomy:    { color: '#F97316', label: 'R' },
  restaurants:   { color: '#F97316', label: 'R' },
  adventure:     { color: '#EF4444', label: 'A' },
  cultural:      { color: '#F59E0B', label: 'C' },
  culture:       { color: '#F59E0B', label: 'C' },
  'eco-tours':   { color: '#22C55E', label: 'E' },
  beaches:       { color: '#0EA5E9', label: 'B' },
  wellness:      { color: '#EC4899', label: 'W' },
  mountains:     { color: '#8B5CF6', label: 'M' },
  cities:        { color: '#6B7280', label: 'P' },
};
const DEFAULT_MARKER = { color: '#6B7280', label: '●' };

/** Generate a Google Maps-style teardrop pin marker on canvas */
function createPinMarker(color: string, label: string, verified = false): ImageData {
  const scale = 2; // retina
  const r = 14;
  const w = r * 2;
  const h = w + 10;
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;

  // Pin shape: circle top + triangle point bottom
  ctx.beginPath();
  ctx.arc(r, r, r - 1.5, Math.PI * 1.15, -Math.PI * 0.15);
  ctx.lineTo(r, h - 2);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  // White border
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // White label
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${r - 2}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, r, r - 0.5);

  // Verified checkmark badge (small green circle in bottom-right of the pin head)
  if (verified) {
    const bx = r + 7, by = r + 5, br = 5;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fillStyle = '#22C55E';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7px sans-serif';
    ctx.fillText('✓', bx, by + 0.5);
  }

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/** Load all category pin marker images into the map style */
function loadMarkerImages(map: MapboxMap) {
  const cats = Object.entries(CATEGORY_MARKERS);
  for (const [key, { color, label }] of cats) {
    const id = `pin-${key}`;
    if (!map.hasImage(id)) {
      map.addImage(id, createPinMarker(color, label), { pixelRatio: 2 });
    }
    const vid = `pin-${key}-verified`;
    if (!map.hasImage(vid)) {
      map.addImage(vid, createPinMarker(color, label, true), { pixelRatio: 2 });
    }
  }
  if (!map.hasImage('pin-default')) {
    map.addImage('pin-default', createPinMarker(DEFAULT_MARKER.color, DEFAULT_MARKER.label), { pixelRatio: 2 });
  }
  if (!map.hasImage('pin-default-verified')) {
    map.addImage('pin-default-verified', createPinMarker(DEFAULT_MARKER.color, DEFAULT_MARKER.label, true), { pixelRatio: 2 });
  }
}

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

      // Load Google Maps-style pin marker images for each category
      loadMarkerImages(map);

      // Hover/selected glow ring (behind markers, driven by feature-state)
      map.addLayer({
        id: GLOW_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 14, 12, 20, 16, 26],
          'circle-color': [
            'match', ['get', 'category'],
            'accommodation', '#3B82F6',
            'gastronomy', '#F97316',
            'restaurants', '#F97316',
            'adventure', '#EF4444',
            'cultural', '#F59E0B',
            'culture', '#F59E0B',
            'eco-tours', '#22C55E',
            'beaches', '#0EA5E9',
            'wellness', '#EC4899',
            'mountains', '#8B5CF6',
            '#6B7280',
          ],
          'circle-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 0.35,
            ['boolean', ['feature-state', 'hover'], false], 0.2,
            0,
          ],
          'circle-opacity-transition': { duration: 150, delay: 0 },
        },
      });

      // Category pin markers (symbol layer — Google Maps style)
      // Uses verified variant when isVerified=1, normal otherwise
      const categoryMatch = [
        'match', ['get', 'category'],
        'accommodation', 'accommodation',
        'gastronomy', 'gastronomy',
        'restaurants', 'gastronomy',
        'adventure', 'adventure',
        'cultural', 'cultural',
        'culture', 'cultural',
        'eco-tours', 'eco-tours',
        'beaches', 'beaches',
        'wellness', 'wellness',
        'mountains', 'mountains',
        'cities', 'cities',
        'default',
      ];
      map.addLayer({
        id: POINT_LAYER,
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': [
            'case',
            ['==', ['get', 'isVerified'], 1],
            ['concat', 'pin-', categoryMatch, '-verified'],
            ['concat', 'pin-', categoryMatch],
          ],
          'icon-size': ['interpolate', ['linear'], ['zoom'],
            5, 0.55,
            8, 0.75,
            12, 1.0,
            16, 1.15,
          ],
          'icon-allow-overlap': true,
          'icon-anchor': 'bottom',
          'icon-padding': 0,
          // Show listing title at zoom >= 12
          'text-field': ['step', ['zoom'], '', 12, ['get', 'title']],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10, 16, 13],
          'text-offset': [0, 0.3],
          'text-anchor': 'top',
          'text-max-width': 8,
          'text-optional': true,
        },
        paint: {
          'icon-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 1,
            ['boolean', ['feature-state', 'hover'], false], 1,
            0.92,
          ],
          'text-color': dark ? '#e2e8f0' : '#1e293b',
          'text-halo-color': dark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
          'text-halo-width': 1.5,
          'text-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0, 12.5, 1],
        },
      });

      // Transparent hit-area circle for WCAG 2.5.5 touch targets (min 44px)
      map.addLayer({
        id: 'listing-pins-hitarea',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 14, 12, 22],
          'circle-opacity': 0,
          'circle-color': 'transparent',
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

      // Click: individual point → preview card (both visible pin and expanded hit-area)
      map.on('click', POINT_LAYER, handlePinLayerClick);
      map.on('click', 'listing-pins-hitarea', handlePinLayerClick);

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
        const { title, city, region } = e.features[0].properties as {
          title: string;
          city: string;
          region: string;
        };
        const subtitle = [city, region].filter(Boolean).join(', ');
        // Build tooltip DOM to avoid XSS via setHTML
      const container = document.createElement('div');
      const titleEl = document.createElement('div');
      titleEl.style.cssText = 'font-size:13px;font-weight:600;white-space:nowrap';
      titleEl.textContent = title;
      container.appendChild(titleEl);
      if (subtitle) {
        const subtitleEl = document.createElement('div');
        subtitleEl.style.cssText = 'font-size:11px;color:#6B7280;margin-top:2px';
        subtitleEl.textContent = subtitle;
        container.appendChild(subtitleEl);
      }
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

  // Update GeoJSON data when pins or hidden categories change (debounced to batch rapid toggles)
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    const source = mapInstanceRef.current.getSource(SOURCE_ID);
    if (!source) return;
    const raf = requestAnimationFrame(() => {
      source.setData(buildGeoJSON(pins, hiddenCategories));
    });
    return () => cancelAnimationFrame(raf);
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
