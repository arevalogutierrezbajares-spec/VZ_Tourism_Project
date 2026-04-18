'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Search, Route, CreditCard, Shield } from 'lucide-react';

const STEPS = [
  {
    number: '01',
    icon: Search,
    title: 'Discover',
    description:
      'Travelers browse curated experiences by destination, category, or influencer picks. AI-powered search helps them find exactly what they want.',
    color: 'oklch(0.55 0.18 220)',
  },
  {
    number: '02',
    icon: Route,
    title: 'Browse Itineraries',
    description:
      'Multi-day trip plans created by local creators and verified travelers. Each itinerary includes lodging, activities, and transport — complete packages.',
    color: 'oklch(0.65 0.15 142)',
  },
  {
    number: '03',
    icon: CreditCard,
    title: 'Book',
    description:
      'Seamless checkout with Stripe or Zelle. Travelers book directly through the platform — your posada gets instant confirmation and guest details.',
    color: 'oklch(0.7 0.15 75)',
  },
  {
    number: '04',
    icon: Shield,
    title: 'Travel Safe',
    description:
      'Real-time safety zones give travelers confidence. Green/yellow/orange/red indicators for every region — building trust that drives bookings.',
    color: 'oklch(0.577 0.245 27)',
  },
];

function StepCard({
  step,
  index,
}: {
  step: (typeof STEPS)[number];
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const Icon = step.icon;

  return (
    <motion.div
      ref={ref}
      className="relative flex flex-col items-center text-center"
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15, ease: 'easeOut' }}
    >
      {/* Connector line (not on last) */}
      {index < STEPS.length - 1 && (
        <div className="hidden lg:block absolute top-10 left-[calc(50%+40px)] w-[calc(100%-80px)] h-px">
          <motion.div
            className="h-full origin-left"
            style={{ backgroundColor: step.color, opacity: 0.3 }}
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.8, delay: index * 0.15 + 0.3 }}
          />
        </div>
      )}

      {/* Number badge */}
      <motion.div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 relative"
        style={{ backgroundColor: `color-mix(in oklch, ${step.color} 12%, transparent)` }}
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <Icon className="w-8 h-8" style={{ color: step.color }} />
        <span
          className="absolute -top-2 -right-2 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center text-white"
          style={{ backgroundColor: step.color }}
        >
          {step.number}
        </span>
      </motion.div>

      <h3 className="text-xl font-semibold text-foreground mb-2">
        {step.title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
        {step.description}
      </p>
    </motion.div>
  );
}

export function HowItWorks() {
  const headerRef = useRef(null);
  const isHeaderInView = useInView(headerRef, { once: true, margin: '-60px' });

  return (
    <section id="how-it-works" className="py-24 sm:py-32 bg-background">
      <div className="max-w-6xl mx-auto px-5">
        {/* Section header */}
        <motion.div
          ref={headerRef}
          className="text-center mb-16 sm:mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sm font-medium tracking-[0.15em] uppercase text-primary mb-3">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            From discovery to doorstep
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
            Four steps that turn international travelers into your guests
          </p>
        </motion.div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {STEPS.map((step, i) => (
            <StepCard key={step.number} step={step} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
