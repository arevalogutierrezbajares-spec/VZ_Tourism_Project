import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Booking, Listing, Notification, Provider } from '@/types/database';

interface ProviderState {
  provider: Provider | null;
  activeListingId: string | null;
  listings: Listing[];
  bookings: Booking[];
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
}

interface ProviderActions {
  setProvider: (provider: Provider | null) => void;
  setActiveListing: (id: string | null) => void;
  setListings: (listings: Listing[]) => void;
  setBookings: (bookings: Booking[]) => void;
  fetchListings: () => Promise<void>;
  fetchBookings: () => Promise<void>;
  setNotifications: (notifications: Notification[]) => void;
  markNotificationRead: (id: string) => void;
  setUnreadCount: (count: number) => void;
}

type ProviderStore = ProviderState & ProviderActions;

export const useProviderStore = create<ProviderStore>()(
  devtools(
    (set, get) => ({
      provider: null,
      activeListingId: null,
      listings: [],
      bookings: [],
      notifications: [],
      unreadCount: 0,
      isLoading: false,

      setProvider: (provider) => set({ provider }),
      setActiveListing: (id) => set({ activeListingId: id }),
      setListings: (listings) => set({ listings }),
      setBookings: (bookings) => set({ bookings }),

      fetchListings: async () => {
        const { provider } = get();
        if (!provider) return;

        set({ isLoading: true });
        try {
          const response = await fetch(`/api/listings?provider_id=${provider.id}`);
          if (response.ok) {
            const data = await response.json();
            set({ listings: data.data || [] });
          }
        } finally {
          set({ isLoading: false });
        }
      },

      fetchBookings: async () => {
        const { provider } = get();
        if (!provider) return;

        set({ isLoading: true });
        try {
          const response = await fetch(`/api/bookings?provider_id=${provider.id}`);
          if (response.ok) {
            const data = await response.json();
            set({ bookings: data.data || [] });
          }
        } finally {
          set({ isLoading: false });
        }
      },

      setNotifications: (notifications) => {
        const unreadCount = notifications.filter((n) => !n.is_read).length;
        set({ notifications, unreadCount });
      },

      markNotificationRead: (id) =>
        set((state) => {
          const notifications = state.notifications.map((n) =>
            n.id === id ? { ...n, is_read: true } : n
          );
          const unreadCount = notifications.filter((n) => !n.is_read).length;
          return { notifications, unreadCount };
        }),

      setUnreadCount: (unreadCount) => set({ unreadCount }),
    }),
    { name: 'provider-store' }
  )
);
