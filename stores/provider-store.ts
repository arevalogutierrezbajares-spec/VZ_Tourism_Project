import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Booking, Listing, Notification, Provider } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

interface ProviderState {
  provider: Provider | null;
  activeListingId: string | null;
  listings: Listing[];
  bookings: Booking[];
  notifications: Notification[];
  unreadCount: number;
  waUnreadCount: number;
  isLoading: boolean;
}

interface ProviderActions {
  setProvider: (provider: Provider | null) => void;
  setActiveListing: (id: string | null) => void;
  setListings: (listings: Listing[]) => void;
  setBookings: (bookings: Booking[]) => void;
  fetchListings: () => Promise<void>;
  fetchBookings: () => Promise<void>;
  fetchEscalatedCount: () => Promise<void>;
  subscribeToEscalations: (providerId: string) => () => void;
  setNotifications: (notifications: Notification[]) => void;
  markNotificationRead: (id: string) => void;
  setUnreadCount: (count: number) => void;
  setWaUnreadCount: (count: number) => void;
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
      waUnreadCount: 0,
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

      fetchEscalatedCount: async () => {
        try {
          const response = await fetch('/api/whatsapp/hitl-count');
          if (response.ok) {
            const { count } = await response.json();
            set({ waUnreadCount: count ?? 0 });
          }
        } catch {
          // Non-critical — fail silently
        }
      },

      subscribeToEscalations: (providerId: string) => {
        const supabase = createClient();
        if (!supabase) return () => undefined;

        // Re-fetch whenever any conversation for this provider changes status.
        // Keeps the sidebar badge live without polling.
        const channel = supabase
          .channel(`escalations:${providerId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'wa_conversations',
              filter: `provider_id=eq.${providerId}`,
            },
            () => {
              void get().fetchEscalatedCount();
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
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
      setWaUnreadCount: (waUnreadCount) => set({ waUnreadCount }),
    }),
    { name: 'provider-store' }
  )
);
