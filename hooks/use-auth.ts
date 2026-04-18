'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import { useItineraryStore } from '@/stores/itinerary-store';
import type { User } from '@/types/database';

/** Fetches the user's DB profile, retrying up to `retries` times with a delay.
 *  Handles the race condition where a first-time OAuth login triggers a DB trigger
 *  that may not have finished creating the row by the time we query. */
async function fetchProfileWithRetry(
  supabase: NonNullable<ReturnType<typeof createClient>>,
  userId: string,
  retries = 3,
  delayMs = 600
): Promise<User | null> {
  for (let i = 0; i < retries; i++) {
    const { data } = await supabase.from('users').select('*').eq('id', userId).single();
    if (data) return data as User;
    if (i < retries - 1) await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

/** Migrates a locally-created anonymous itinerary to Supabase on sign-in.
 *  Only runs when there is a persisted local itinerary (id starts with 'local-').
 *  After migration, updates the store's current itinerary id to the Supabase id.
 */
async function migrateLocalItineraryOnSignIn(userId: string) {
  const { current, days } = useItineraryStore.getState();
  if (!current || !current.id.startsWith('local-')) return;

  try {
    const allStops = days.flatMap((d) => d.stops);
    const res = await fetch('/api/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: current.title,
        description: current.description,
        total_days: current.total_days,
        regions: current.regions,
        tags: current.tags,
        start_date: current.start_date,
        is_public: false,
        stops: allStops,
      }),
    });
    if (res.ok) {
      const { data } = await res.json();
      if (data?.id) {
        useItineraryStore.getState().setItinerary({ ...current, id: data.id, user_id: userId });
      }
    }
  } catch {
    // Non-blocking — local copy remains in place
  }
}

/** Merges localStorage favorites with Supabase on sign-in.
 *  - Reads persisted favorites from the store (localStorage via persist middleware)
 *  - Upserts any local favorites to Supabase (ignores FK/conflict errors per-row)
 *  - Fetches the authoritative list from Supabase and hydrates the store
 */
async function syncFavoritesOnSignIn(
  supabase: NonNullable<ReturnType<typeof createClient>>,
  userId: string
) {
  const { favorites: localFavorites } = useFavoritesStore.getState();

  // Attempt to push localStorage favorites to Supabase (best-effort, ignore FK errors)
  if (localFavorites.length > 0) {
    await Promise.allSettled(
      localFavorites.map((listingId) =>
        supabase
          .from('favorites')
          .upsert({ user_id: userId, listing_id: listingId }, { onConflict: 'user_id,listing_id' })
      )
    );
  }

  // Fetch the authoritative favorites list from Supabase
  const { data } = await supabase
    .from('favorites')
    .select('listing_id')
    .eq('user_id', userId);

  const serverFavorites = (data ?? []).map((r: { listing_id: string }) => r.listing_id);
  useFavoritesStore.getState().setFavorites(serverFavorites, userId);
}

export function useAuth() {
  const { user, profile, loading, initialized, setUser, setProfile, setLoading, setInitialized, signOut } =
    useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        // If a demo user is persisted in the store, skip the Supabase session
        // check entirely — demo users have no real session to validate.
        const currentUser = useAuthStore.getState().user;
        if (currentUser?.id === 'demo-user-001') {
          setLoading(false);
          setInitialized(true);
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const authUser = session.user;

          // Set a minimal user immediately so isAuthenticated is true while the
          // full DB profile loads (avoids flash of "logged out" state on first render).
          const minimalUser: User = {
            id: authUser.id,
            email: authUser.email ?? '',
            full_name: authUser.user_metadata?.full_name ?? authUser.email ?? '',
            avatar_url: authUser.user_metadata?.avatar_url ?? null,
            role: 'tourist',
            phone: null,
            nationality: null,
            preferred_language: 'en',
            created_at: authUser.created_at,
            updated_at: authUser.updated_at ?? authUser.created_at,
          };
          setUser(minimalUser);

          // Fetch full DB profile with retry (handles first-login race condition).
          const dbProfile = await fetchProfileWithRetry(supabase, authUser.id);
          setProfile(dbProfile);

          // Sync localStorage favorites + anonymous itinerary to Supabase
          syncFavoritesOnSignIn(supabase, authUser.id).catch(console.error);
          migrateLocalItineraryOnSignIn(authUser.id).catch(console.error);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Don't let Supabase auth events affect a demo user session.
      if (useAuthStore.getState().user?.id === 'demo-user-001') return;

      if (session?.user) {
        const authUser = session.user;
        const minimalUser: User = {
          id: authUser.id,
          email: authUser.email ?? '',
          full_name: authUser.user_metadata?.full_name ?? authUser.email ?? '',
          avatar_url: authUser.user_metadata?.avatar_url ?? null,
          role: 'tourist',
          phone: null,
          nationality: null,
          preferred_language: 'en',
          created_at: authUser.created_at,
          updated_at: authUser.updated_at ?? authUser.created_at,
        };
        setUser(minimalUser);

        const dbProfile = await fetchProfileWithRetry(supabase, authUser.id);
        setProfile(dbProfile);

        // Sync localStorage favorites to Supabase and hydrate store
        syncFavoritesOnSignIn(supabase, authUser.id).catch(console.error);
      } else {
        setUser(null);
        setProfile(null);
        useFavoritesStore.getState().reset();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setInitialized, setLoading, setProfile, setUser]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return {
    user,
    profile,
    loading,
    initialized,
    isAuthenticated: !!user,
    isProvider: profile?.role === 'provider',
    isAdmin: profile?.role === 'admin',
    isTourist: profile?.role === 'tourist',
    isCreator: profile?.role === 'creator',
    signOut: handleSignOut,
  };
}
