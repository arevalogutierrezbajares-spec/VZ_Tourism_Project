'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import type { User } from '@/types/database';

export function useAuth() {
  const { user, profile, loading, initialized, setUser, setProfile, setLoading, setInitialized, signOut } =
    useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          setUser(profile as User);
          setProfile(profile as User);
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
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        setUser(profile as User);
        setProfile(profile as User);
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
