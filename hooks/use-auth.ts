'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
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
      } else {
        setUser(null);
        setProfile(null);
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
