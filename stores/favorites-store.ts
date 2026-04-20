import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoritesState {
  favorites: string[]; // listing IDs
  loaded: boolean;
  userId: string | null;
}

interface FavoritesActions {
  setFavorites: (favorites: string[], userId: string) => void;
  addFavorite: (listingId: string) => void;
  removeFavorite: (listingId: string) => void;
  toggleFavorite: (listingId: string) => void;
  reset: () => void;
}

export const useFavoritesStore = create<FavoritesState & FavoritesActions>()(
  persist(
    (set, get) => ({
      favorites: [],
      loaded: false,
      userId: null,

      setFavorites: (favorites, userId) => set({ favorites, loaded: true, userId }),
      addFavorite: (id) => set((s) => ({ favorites: [...s.favorites, id] })),
      removeFavorite: (id) => set((s) => ({ favorites: s.favorites.filter((f) => f !== id) })),
      toggleFavorite: (id) => {
        const { favorites, addFavorite, removeFavorite } = get();
        if (favorites.includes(id)) removeFavorite(id);
        else addFavorite(id);
      },
      reset: () => set({ favorites: [], loaded: false, userId: null }),
    }),
    {
      name: 'vz_favorites',
      skipHydration: true,
      // Only persist the favorites array — not auth state (userId/loaded)
      partialize: (state) => ({ favorites: state.favorites }),
    }
  )
);
