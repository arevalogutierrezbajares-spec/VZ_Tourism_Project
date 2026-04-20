'use client';

/**
 * Mounted in app/layout.tsx so the auth subscription is always active — even
 * on pages that have no Navbar (login, register, etc.).  This ensures that when
 * signInWithPassword succeeds, onAuthStateChange fires into our Zustand store
 * immediately rather than waiting for the next page's Navbar to mount.
 */
import { useAuth } from '@/hooks/use-auth';

export function AuthInitializer() {
  useAuth();
  return null;
}
