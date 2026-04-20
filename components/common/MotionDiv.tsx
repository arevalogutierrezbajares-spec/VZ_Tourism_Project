'use client';

import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';

/**
 * A motion.div wrapper that respects prefers-reduced-motion.
 * When reduced motion is preferred, renders a plain <div> with no animation.
 *
 * This is a utility for cases where you want explicit per-component control
 * beyond what the global MotionConfig provider handles (e.g. custom JS-driven
 * transforms, inline style animations, or non-Framer animation code).
 */
export function MotionDiv({
  transition,
  animate,
  initial,
  whileInView,
  ...props
}: HTMLMotionProps<'div'>) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div {...(props as React.HTMLAttributes<HTMLDivElement>)} />;
  }

  return (
    <motion.div
      initial={initial}
      animate={animate}
      whileInView={whileInView}
      transition={transition}
      {...props}
    />
  );
}
