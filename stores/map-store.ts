import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { MapPin, MapRoute } from '@/types/map';
import type { SafetyZone } from '@/types/database';
import { VENEZUELA_CENTER, VENEZUELA_DEFAULT_ZOOM } from '@/lib/constants';

interface MapState {
  center: [number, number];
  zoom: number;
  bearing: number;
  pins: MapPin[];
  routes: MapRoute[];
  selectedPin: MapPin | null;
  safetyZones: SafetyZone[];
  showSafetyZones: boolean;
  is3DTerrain: boolean;
  isDarkMode: boolean;
  hiddenCategories: Set<string>;
  targetBounds: [[number, number], [number, number]] | null;
}

interface MapActions {
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setBearing: (bearing: number) => void;
  addPin: (pin: MapPin) => void;
  removePin: (id: string) => void;
  setPins: (pins: MapPin[]) => void;
  setSelectedPin: (pin: MapPin | null) => void;
  toggleSafetyZones: () => void;
  setSafetyZones: (zones: SafetyZone[]) => void;
  addRoute: (route: MapRoute) => void;
  clearRoutes: () => void;
  toggle3DTerrain: () => void;
  toggleDarkMode: () => void;
  toggleCategory: (category: string) => void;
  setTargetBounds: (bounds: [[number, number], [number, number]] | null) => void;
}

type MapStore = MapState & MapActions;

export const useMapStore = create<MapStore>()(
  devtools(
    (set) => ({
      // State
      center: VENEZUELA_CENTER,
      zoom: VENEZUELA_DEFAULT_ZOOM,
      bearing: 0,
      pins: [],
      routes: [],
      selectedPin: null,
      safetyZones: [],
      showSafetyZones: false,
      is3DTerrain: false,
      isDarkMode: false,
      hiddenCategories: new Set<string>(),
      targetBounds: null,

      // Actions
      setCenter: (center) => set({ center }),
      setZoom: (zoom) => set({ zoom }),
      setBearing: (bearing) => set({ bearing }),

      addPin: (pin) =>
        set((state) => ({
          pins: [...state.pins.filter((p) => p.id !== pin.id), pin],
        })),

      removePin: (id) =>
        set((state) => ({
          pins: state.pins.filter((p) => p.id !== id),
          selectedPin: state.selectedPin?.id === id ? null : state.selectedPin,
        })),

      setPins: (pins) => set({ pins }),

      setSelectedPin: (pin) =>
        set((state) => ({
          selectedPin: pin,
          pins: state.pins.map((p) => ({
            ...p,
            isSelected: p.id === pin?.id,
          })),
        })),

      toggleSafetyZones: () =>
        set((state) => ({ showSafetyZones: !state.showSafetyZones })),

      setSafetyZones: (safetyZones) => set({ safetyZones }),

      addRoute: (route) =>
        set((state) => ({
          routes: [...state.routes.filter((r) => r.id !== route.id), route],
        })),

      clearRoutes: () => set({ routes: [] }),

      toggle3DTerrain: () =>
        set((state) => ({ is3DTerrain: !state.is3DTerrain })),

      toggleDarkMode: () =>
        set((state) => ({ isDarkMode: !state.isDarkMode })),

      toggleCategory: (category) =>
        set((state) => {
          const next = new Set(state.hiddenCategories);
          if (next.has(category)) next.delete(category);
          else next.add(category);
          return { hiddenCategories: next };
        }),

      setTargetBounds: (targetBounds) => set({ targetBounds }),
    }),
    { name: 'map-store' }
  )
);
