import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface RecentlyViewedItem {
  id: string;
  slug: string;
  title: string;
  cover_image_url: string | null;
  location_name: string;
  price_usd: number | null;
  category: string;
  viewed_at: string;
}

interface RecentlyViewedState {
  items: RecentlyViewedItem[];
}

interface RecentlyViewedActions {
  addItem: (item: Omit<RecentlyViewedItem, 'viewed_at'>) => void;
  clear: () => void;
}

const MAX_ITEMS = 10;

export const useRecentlyViewedStore = create<RecentlyViewedState & RecentlyViewedActions>()(
  devtools(
    persist(
      (set) => ({
        items: [],

        addItem: (item) =>
          set((state) => {
            const filtered = state.items.filter((i) => i.id !== item.id);
            const next = [{ ...item, viewed_at: new Date().toISOString() }, ...filtered].slice(
              0,
              MAX_ITEMS
            );
            return { items: next };
          }),

        clear: () => set({ items: [] }),
      }),
      { name: 'vz-recently-viewed', skipHydration: true }
    ),
    { name: 'recently-viewed-store' }
  )
);
