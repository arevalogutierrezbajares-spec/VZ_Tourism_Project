import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Itinerary, ItineraryStop } from '@/types/database';

interface ItineraryDay {
  day: number;
  title: string;
  stops: ItineraryStop[];
}

interface ItineraryState {
  current: Itinerary | null;
  days: ItineraryDay[];
  totalCost: number;
  isDirty: boolean;
  isSaving: boolean;
  isOpen: boolean;
  activeTab: 'stops' | 'ai';
  lastAddedStopId: string | null;
}

interface ItineraryActions {
  setItinerary: (itinerary: Itinerary) => void;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  setActiveTab: (tab: 'stops' | 'ai') => void;
  clearPeek: () => void;
  addDay: () => void;
  removeDay: (day: number) => void;
  addStop: (stop: Omit<ItineraryStop, 'id' | 'created_at'>) => void;
  removeStop: (stopId: string) => void;
  moveStop: (stopId: string, newDay: number, newOrder: number) => void;
  updateStop: (stopId: string, data: Partial<ItineraryStop>) => void;
  calculateCost: () => void;
  save: () => Promise<void>;
  clear: () => void;
}

type ItineraryStore = ItineraryState & ItineraryActions;

const persistedStore = persist<ItineraryStore>(
  (set, get) => ({
    current: null,
    days: [],
    totalCost: 0,
    isDirty: false,
    isSaving: false,
    isOpen: false,
    activeTab: 'stops',
    lastAddedStopId: null,

    setItinerary: (itinerary) => {
      const stops = itinerary.stops || [];
      const maxDay = stops.reduce((max, s) => Math.max(max, s.day), itinerary.total_days || 1);
      const days: ItineraryDay[] = [];
      for (let d = 1; d <= maxDay; d++) {
        days.push({
          day: d,
          title: `Day ${d}`,
          stops: stops.filter((s) => s.day === d).sort((a, b) => a.order - b.order),
        });
      }
      set({ current: itinerary, days, isDirty: false });
      get().calculateCost();
    },

    openPanel: () => set({ isOpen: true }),
    closePanel: () => set({ isOpen: false }),
    togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),
    setActiveTab: (tab) => set({ activeTab: tab }),
    clearPeek: () => set({ lastAddedStopId: null }),

    addDay: () =>
      set((state) => ({
        days: [
          ...state.days,
          {
            day: state.days.length + 1,
            title: `Day ${state.days.length + 1}`,
            stops: [],
          },
        ],
        isDirty: true,
      })),

    removeDay: (day) =>
      set((state) => {
        const filtered = state.days.filter((d) => d.day !== day);
        const renumbered = filtered.map((d, idx) => ({
          ...d,
          day: idx + 1,
          title: `Day ${idx + 1}`,
          stops: d.stops.map((s) => ({ ...s, day: idx + 1 })),
        }));
        return { days: renumbered, isDirty: true };
      }),

    addStop: (stop) => {
      // Dedup guard: skip if same listing already exists on the same day
      const { days } = get();
      if (stop.listing_id) {
        const isDupe = days.some((d) =>
          d.day === stop.day && d.stops.some((s) => s.listing_id === stop.listing_id)
        );
        if (isDupe) return;
      }

      const id = `stop-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const newStop: ItineraryStop = {
        ...stop,
        id,
        created_at: new Date().toISOString(),
      };
      set((state) => {
        // Auto-create a local itinerary if none exists
        let { current, days } = state;
        if (!current) {
          const now = new Date().toISOString();
          current = {
            id: `local-${Date.now()}`,
            user_id: 'local',
            title: 'My Trip',
            description: null,
            cover_image_url: null,
            start_date: null,
            end_date: null,
            is_public: false,
            is_template: false,
            is_influencer_pick: false,
            referral_code: null,
            total_days: 1,
            estimated_cost_usd: 0,
            regions: [],
            tags: [],
            likes: 0,
            saves: 0,
            views: 0,
            created_at: now,
            updated_at: now,
            stops: [],
          };
        }

        // Ensure the target day exists
        if (!days.some((d) => d.day === stop.day)) {
          const maxDay = Math.max(stop.day, days.length);
          for (let d = days.length + 1; d <= maxDay; d++) {
            days = [...days, { day: d, title: `Day ${d}`, stops: [] }];
          }
        }

        const updatedDays = days.map((d) => {
          if (d.day === stop.day) {
            return {
              ...d,
              stops: [...d.stops, newStop].sort((a, b) => a.order - b.order),
            };
          }
          return d;
        });
        return { current, days: updatedDays, isDirty: true, lastAddedStopId: id };
      });
      get().calculateCost();
    },

    removeStop: (stopId) => {
      set((state) => {
        const days = state.days.map((d) => ({
          ...d,
          stops: d.stops.filter((s) => s.id !== stopId),
        }));
        return { days, isDirty: true };
      });
      get().calculateCost();
    },

    moveStop: (stopId, newDay, newOrder) => {
      set((state) => {
        let movedStop: ItineraryStop | null = null;
        const days = state.days.map((d) => ({
          ...d,
          stops: d.stops.filter((s) => {
            if (s.id === stopId) {
              movedStop = { ...s, day: newDay, order: newOrder };
              return false;
            }
            return true;
          }),
        }));

        if (!movedStop) return state;

        const updatedDays = days.map((d) => {
          if (d.day === newDay) {
            return {
              ...d,
              stops: [...d.stops, movedStop!].sort((a, b) => a.order - b.order),
            };
          }
          return d;
        });

        return { days: updatedDays, isDirty: true };
      });
    },

    updateStop: (stopId, data) => {
      set((state) => {
        const days = state.days.map((d) => ({
          ...d,
          stops: d.stops.map((s) => (s.id === stopId ? { ...s, ...data } : s)),
        }));
        return { days, isDirty: true };
      });
      get().calculateCost();
    },

    calculateCost: () => {
      const { days } = get();
      const total = days.reduce(
        (sum, day) => sum + day.stops.reduce((s, stop) => s + (stop.cost_usd || 0), 0),
        0
      );
      set({ totalCost: total });
    },

    save: async () => {
      const { current, days } = get();
      // Anonymous users: data is already persisted to localStorage by the persist middleware
      if (!current?.id || current.id.startsWith('local-')) {
        set({ isDirty: false });
        return;
      }

      set({ isSaving: true });
      try {
        const allStops = days.flatMap((d) => d.stops);
        const response = await fetch(`/api/itineraries/${current.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            total_days: days.length,
            estimated_cost_usd: get().totalCost,
            stops: allStops,
          }),
        });

        if (response.ok) {
          set({ isDirty: false });
        } else {
          throw new Error(`Save failed (${response.status})`);
        }
      } finally {
        set({ isSaving: false });
      }
    },

    clear: () =>
      set({
        current: null,
        days: [],
        totalCost: 0,
        isDirty: false,
        isOpen: false,
        activeTab: 'stops',
        lastAddedStopId: null,
      }),
  }),
  {
    name: 'vz_itinerary',
    skipHydration: true,
    // Only persist data — not ephemeral UI state (isOpen, isSaving)
    // Cast required: partialize intentionally excludes ephemeral UI state (isSaving, isOpen)
    partialize: (state) => ({
      current: state.current,
      days: state.days,
      totalCost: state.totalCost,
      isDirty: state.isDirty,
    }) as unknown as ItineraryStore,
  }
);

export const useItineraryStore = create<ItineraryStore>()(
  devtools(persistedStore, {
    name: 'itinerary-store',
    enabled: process.env.NODE_ENV === 'development',
  })
);
