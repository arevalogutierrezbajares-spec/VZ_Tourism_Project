import { useEffect, useRef, useState } from 'react';
import { useMapStore } from '@/stores/map-store';
import { buildGeoJSON } from '@/lib/mapbox/helpers';
import { VENEZUELA_CENTER, VENEZUELA_DEFAULT_ZOOM } from '@/lib/constants';
import type { MapboxMap } from '../mapbox-types';
import { SOURCE_ID } from '../map-constants';

/**
 * Creates the Mapbox GL instance, sets up resize observer, WebGL handlers,
 * navigation controls, store subscription for GeoJSON updates, and cleanup.
 */
export function useMapInit(
  mapRef: { current: HTMLDivElement | null },
  mapInstanceRef: { current: MapboxMap | null },
  selectedIdRef: { current: string | null },
  addListingsLayers: (map: MapboxMap) => Promise<void>,
  opts: { isDarkMode: boolean; interactive: boolean },
) {
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const storeSubRef = useRef<(() => void) | null>(null);
  const webglHandlersRef = useRef<{ lost: (e: Event) => void; restored: () => void } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

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
        style: opts.isDarkMode
          ? 'mapbox://styles/mapbox/dark-v11'
          : 'mapbox://styles/mapbox/outdoors-v12',
        center: VENEZUELA_CENTER,
        zoom: VENEZUELA_DEFAULT_ZOOM,
        bearing: 0,
        pitch: 0,
        interactive: opts.interactive,
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
      webglHandlersRef.current = {
        lost: (e: Event) => {
          e.preventDefault();
          setMapError('Map display interrupted — restoring...');
        },
        restored: () => {
          setMapError(null);
        },
      };
      mapCanvas.addEventListener('webglcontextlost', webglHandlersRef.current.lost);
      mapCanvas.addEventListener('webglcontextrestored', webglHandlersRef.current.restored);

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

        // Subscribe to store changes to update GeoJSON source data.
        // This bypasses React's useEffect lifecycle — the `map` variable
        // in this closure is guaranteed to be the live Mapbox instance,
        // immune to React 18 Strict Mode ref-nulling.
        storeSubRef.current?.();
        let prevPins = useMapStore.getState().pins;
        let prevHidden = useMapStore.getState().hiddenCategories;
        storeSubRef.current = useMapStore.subscribe((state) => {
          if (state.pins === prevPins && state.hiddenCategories === prevHidden) return;
          prevPins = state.pins;
          prevHidden = state.hiddenCategories;
          const source = map.getSource(SOURCE_ID);
          if (!source) return;
          const geo = buildGeoJSON(state.pins, state.hiddenCategories);
          source.setData(geo);
        });

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
      storeSubRef.current?.();
      storeSubRef.current = null;
      resizeObserverRef.current?.disconnect();
      if (mapInstanceRef.current) {
        // Clean up WebGL context listeners before removing the map
        if (webglHandlersRef.current) {
          try {
            const canvas = mapInstanceRef.current.getCanvas();
            canvas.removeEventListener('webglcontextlost', webglHandlersRef.current.lost);
            canvas.removeEventListener('webglcontextrestored', webglHandlersRef.current.restored);
          } catch { /* canvas may already be disposed */ }
          webglHandlersRef.current = null;
        }
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { mapLoaded, mapError };
}
