import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { User } from '@/types/database';

interface AuthState {
  user: User | null;
  profile: User | null;
  loading: boolean;
  initialized: boolean;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setProfile: (profile: User | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        profile: null,
        loading: true,
        initialized: false,

        setUser: (user) => set({ user }),
        setProfile: (profile) => set({ profile }),
        setLoading: (loading) => set({ loading }),
        setInitialized: (initialized) => set({ initialized }),

        signOut: async () => {
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          if (supabase) await supabase.auth.signOut();
          set({ user: null, profile: null, initialized: false });
        },

        updateProfile: async (data) => {
          const { profile } = get();
          if (!profile) return;

          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          if (!supabase) return;

          const { data: updated, error } = await supabase
            .from('users')
            .update(data)
            .eq('id', profile.id)
            .select()
            .single();

          if (!error && updated) {
            set({ profile: updated as User });
          }
        },
      }),
      {
        name: 'vz-auth',
        skipHydration: true,
        // Only persist user/profile — loading/initialized are transient
        partialize: (state) => ({ user: state.user, profile: state.profile }),
      }
    ),
    { name: 'auth-store' }
  )
);
