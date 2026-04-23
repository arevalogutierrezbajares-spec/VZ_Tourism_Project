/** Hand-rolled Mapbox GL JS types (avoids pulling in @types/mapbox-gl for tree-shaking).
 *  Corresponds to mapbox-gl v3.x API surface used in this project. */

export type MapboxMap = {
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
  fitBounds: (bounds: [[number, number], [number, number]], opts?: unknown) => void;
  setStyle: (style: string) => void;
  setFeatureState: (feature: { source: string; id: string | number }, state: Record<string, unknown>) => void;
  removeFeatureState: (feature: { source: string; id?: string | number }) => void;
  getCanvas: () => HTMLCanvasElement;
  resize: () => void;
  remove: () => void;
  queryRenderedFeatures: (point: unknown, opts: unknown) => MapboxFeature[];
};

export type MapboxSource = {
  setData: (data: unknown) => void;
  getClusterExpansionZoom: (clusterId: number, cb: (err: Error | null, zoom: number) => void) => void;
};

export type MapboxEvent = {
  lngLat: { lng: number; lat: number };
  features?: MapboxFeature[];
  point: unknown;
};

export type MapboxFeature = {
  id?: string | number;
  geometry: { coordinates: [number, number] };
  properties: Record<string, unknown>;
};

export type MapboxPopup = {
  setLngLat: (coords: [number, number]) => MapboxPopup;
  setHTML: (html: string) => MapboxPopup;
  setDOMContent: (el: HTMLElement) => MapboxPopup;
  addTo: (map: unknown) => MapboxPopup;
  remove: () => void;
};
