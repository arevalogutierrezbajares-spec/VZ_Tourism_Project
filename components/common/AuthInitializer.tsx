'use client';

/**
 * Mounted in app/layout.tsx so the auth subscription is always active — even
 * on pages that have no Navbar (login, register, etc.).  This ensures that when
 * signInWithPassword succeeds, onAuthStateChange fires into our Zustand store
 * immediately rather than waiting for the next page's Navbar to mount.
 */
import { useAuth } from '@/hooks/use-auth';

// Suppress the known Supabase gotrue-js "Lock was stolen" AbortError.
// React Strict Mode double-mounts components, which orphans navigator.locks
// acquired by gotrue's session management. gotrue recovers automatically,
// but the old lock holder throws an unhandled AbortError that Next.js dev
// mode surfaces as an error overlay. This is cosmetic — auth still works.
// Must be module-level to run before Next.js error overlay captures it.
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    if (e.reason?.name === 'AbortError') {
      e.preventDefault();
    }
  });
}

export function AuthInitializer() {
  useAuth();
  return null;
}
