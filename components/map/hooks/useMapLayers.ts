import { useCallback, useRef } from 'react';
import { useMapStore } from '@/stores/map-store';
import { CATEGORY_COLORS, buildGeoJSON } from '@/lib/mapbox/helpers';
import type { MapPin } from '@/types/map';
import type { MapboxMap, MapboxPopup, MapboxEvent } from '../mapbox-types';
import {
  SOURCE_ID,
  CLUSTER_LAYER,
  CLUSTER_COUNT_LAYER,
  POINT_LAYER,
  GLOW_LAYER,
  DEFAULT_COLOR,
  CATEGORY_COLOR_EXPR,
} from '../map-constants';

/** Build the tooltip DOM for a hovered pin (pure function, no React). */
function buildPinTooltip(
  props: { title: string; city: string; region: string; category: string; rating: number | null },
  isDark: boolean,
): HTMLDivElement {
  const subtitle = [props.city, props.region].filter(Boolean).join(', ');
  const catColor = CATEGORY_COLORS[props.category] ?? DEFAULT_COLOR;
  const fgColor = isDark ? '#e2e8f0' : '#1e293b';
  const mutedColor = isDark ? '#94a3b8' : '#6B7280';
  const sepColor = isDark ? '#475569' : '#D1D5DB';

  const container = document.createElement('div');
  container.style.cssText = `display:flex;align-items:flex-start;gap:8px;color:${fgColor}`;

  const dot = document.createElement('span');
  dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${catColor};flex-shrink:0;margin-top:4px`;
  container.appendChild(dot);

  const textWrap = document.createElement('div');
  const titleEl = document.createElement('div');
  titleEl.style.cssText = `font-size:13px;font-weight:600;white-space:nowrap;max-width:200px;overflow:hidden;text-overflow:ellipsis;color:${fgColor}`;
  titleEl.textContent = props.title;
  textWrap.appendChild(titleEl);

  if (subtitle || (props.rating != null && props.rating > 0)) {
    const metaEl = document.createElement('div');
    metaEl.style.cssText = `font-size:11px;color:${mutedColor};margin-top:1px;display:flex;align-items:center;gap:4px`;
    if (props.rating != null && props.rating > 0) {
      const starSpan = document.createElement('span');
      starSpan.textContent = `★ ${props.rating.toFixed(1)}`;
      starSpan.style.cssText = 'color:#F59E0B;font-weight:600';
      metaEl.appendChild(starSpan);
      if (subtitle) {
        const sep = document.createElement('span');
        sep.textContent = '·';
        sep.style.color = sepColor;
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
  return container;
}

/**
 * Returns the `addListingsLayers` callback — adds GeoJSON source,
 * all map layers (clusters, pins, labels), popup tooltip, and
 * wires up click/hover event handlers.
 */
export function useMapLayers(
  tooltipRef: { current: MapboxPopup | null },
  hoveredIdRef: { current: string | null },
  handlePinClick: (pin: MapPin) => void,
) {
  // Ref ensures the map click handler always calls the latest callback,
  // even though addListingsLayers is memoized with [] deps.
  const handlePinClickRef = useRef(handlePinClick);
  handlePinClickRef.current = handlePinClick;

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
          const clampedZoom = Math.min(zoomLevel, 18);
          const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          if (prefersReducedMotion) {
            map.easeTo({ center: coordinates, zoom: clampedZoom, duration: 0 });
          } else {
            map.flyTo({
              center: coordinates,
              zoom: clampedZoom,
              curve: 1.42,
              speed: 1.6,
              maxDuration: 1500,
              essential: true,
            });
          }
        });
      });

      // Shared handler for pin click — looks up the full pin from the store by ID
      function handlePinLayerClick(e: MapboxEvent) {
        if (!e.features?.length) return;
        const pinId = e.features[0].properties['id'] as string | undefined;
        if (!pinId) return;
        const pin = useMapStore.getState().pins.find((p) => p.id === pinId);
        if (pin) {
          handlePinClickRef.current(pin);
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
          .addTo(map);
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
        const props = e.features[0].properties as {
          title: string;
          city: string;
          region: string;
          category: string;
          rating: number | null;
        };
        const darkNow = useMapStore.getState().isDarkMode;
        const container = buildPinTooltip(props, darkNow);
        tooltipRef.current
          .setLngLat([e.lngLat.lng, e.lngLat.lat])
          .setDOMContent(container)
          .addTo(map);
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

  return addListingsLayers;
}
