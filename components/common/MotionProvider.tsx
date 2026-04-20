'use client';

import { MotionConfig } from 'framer-motion';

/**
 * Wraps children with Framer Motion's MotionConfig set to respect the OS
 * `prefers-reduced-motion` media query.  When the user has reduced-motion
 * enabled, all `motion.*` components rendered inside this provider will
 * skip their animations automatically.
 *
 * Usage: wrap the app once in the root layout.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
