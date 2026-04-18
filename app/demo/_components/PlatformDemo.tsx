'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Route,
  Map,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const FEATURES = [
  {
    id: 'listings',
    icon: BookOpen,
    label: 'Browse Experiences',
    title: 'A curated library of Venezuelan experiences',
    description:
      'Travelers browse by category (beaches, mountains, eco-tours, gastronomy) or destination. Each listing shows ratings, pricing, safety badges, and creator recommendations — everything they need to book with confidence.',
    highlights: [
      '8 categories with filtered browsing',
      'Star ratings & social proof',
      'Safety-verified badges',
      'Creator-recommended picks',
    ],
    mockupBg: 'from-sky-500/10 to-teal-500/10',
    color: 'oklch(0.55 0.18 220)',
  },
  {
    id: 'itineraries',
    icon: Route,
    label: 'Itinerary Builder',
    title: 'Multi-day trip plans that sell themselves',
    description:
      'Creators build complete itineraries — lodging, activities, transport, meals. Travelers customize and book entire trips. Your posada becomes part of curated journeys that reach thousands.',
    highlights: [
      'Creator-curated multi-day plans',
      'Includes lodging, activities & transport',
      '"Book This Trip" one-click checkout',
      'Influencer-driven traffic',
    ],
    mockupBg: 'from-emerald-500/10 to-green-500/10',
    color: 'oklch(0.65 0.15 142)',
  },
  {
    id: 'map',
    icon: Map,
    label: 'Map Exploration',
    title: 'Discover Venezuela on an interactive map',
    description:
      'Mapbox-powered exploration lets travelers see every experience geographically. They can find your posada by zooming into a region, seeing what is nearby, and planning their route visually.',
    highlights: [
      'Interactive Mapbox integration',
      'Geographic discovery of listings',
      'Regional clustering & zoom',
      'Safety zone overlays',
    ],
    mockupBg: 'from-amber-500/10 to-orange-500/10',
    color: 'oklch(0.7 0.15 75)',
  },
  {
    id: 'booking',
    icon: ShoppingCart,
    label: 'Booking Flow',
    title: 'Frictionless booking, instant confirmation',
    description:
      'Full checkout with Stripe payments and Zelle option. Travelers enter passenger details, select dates, and pay — you get an instant notification with everything you need to prepare for their arrival.',
    highlights: [
      'Stripe + Zelle payment options',
      'Instant booking confirmation',
      'Passenger details collection',
      'Provider dashboard notifications',
    ],
    mockupBg: 'from-rose-500/10 to-pink-500/10',
    color: 'oklch(0.577 0.245 27)',
  },
];

export function PlatformDemo() {
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const advance = useCallback(() => {
    setActive((prev) => (prev + 1) % FEATURES.length);
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    if (isPaused) return;
    timerRef.current = setInterval(advance, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, advance]);

  const goTo = (index: number) => {
    setActive(index);
    setIsPaused(true);
    // Resume auto after 10s of inactivity
    setTimeout(() => setIsPaused(false), 10000);
  };

  const feature = FEATURES[active];

  return (
    <section
      id="platform"
      ref={sectionRef}
      className="py-24 sm:py-32 bg-muted/30"
    >
      <div className="max-w-6xl mx-auto px-5">
        {/* Section header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sm font-medium tracking-[0.15em] uppercase text-primary mb-3">
            Platform Demo
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            See what travelers experience
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
            Every feature is designed to drive bookings to your property
          </p>
        </motion.div>

        {/* Feature tabs */}
        <motion.div
          className="flex justify-center gap-2 sm:gap-3 mb-12 flex-wrap"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                onClick={() => goTo(i)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium cursor-pointer transition-all duration-300 ${
                  i === active
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-background text-muted-foreground hover:text-foreground hover:bg-background/80 border'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{f.label}</span>
              </button>
            );
          })}
        </motion.div>

        {/* Demo content */}
        <div className="relative">
          {/* Navigation arrows */}
          <button
            onClick={() =>
              goTo((active - 1 + FEATURES.length) % FEATURES.length)
            }
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 w-10 h-10 rounded-full bg-background border shadow-md flex items-center justify-center cursor-pointer hover:bg-muted transition-colors hidden lg:flex"
            aria-label="Previous feature"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => goTo((active + 1) % FEATURES.length)}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 w-10 h-10 rounded-full bg-background border shadow-md flex items-center justify-center cursor-pointer hover:bg-muted transition-colors hidden lg:flex"
            aria-label="Next feature"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <AnimatePresence mode="wait">
            <motion.div
              key={feature.id}
              className="grid lg:grid-cols-2 gap-10 items-center"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              {/* Left: Info */}
              <div className="order-2 lg:order-1">
                <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {feature.description}
                </p>
                <ul className="space-y-3">
                  {feature.highlights.map((h, i) => (
                    <motion.li
                      key={h}
                      className="flex items-start gap-3 text-sm"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 + 0.2 }}
                    >
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-xs font-bold"
                        style={{ backgroundColor: feature.color }}
                      >
                        ✓
                      </span>
                      <span className="text-foreground">{h}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Right: Mockup placeholder */}
              <div className="order-1 lg:order-2">
                <div
                  className={`aspect-[4/3] rounded-2xl bg-gradient-to-br ${feature.mockupBg} border flex items-center justify-center overflow-hidden relative`}
                >
                  {/* Browser chrome mockup */}
                  <div className="absolute top-0 left-0 right-0 h-10 bg-background/80 backdrop-blur border-b flex items-center px-4 gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400/60" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                      <div className="w-3 h-3 rounded-full bg-green-400/60" />
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="h-5 bg-muted rounded-md max-w-xs mx-auto flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground">
                          vzexplorer.com/{feature.id}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Content area */}
                  <div className="pt-10 p-6 w-full h-full flex flex-col gap-3">
                    {/* Skeleton UI representing the feature */}
                    <div className="flex gap-3 mb-2">
                      {[1, 2, 3].map((n) => (
                        <motion.div
                          key={n}
                          className="h-8 rounded-full bg-background/60 flex-1"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ delay: n * 0.1, duration: 0.4 }}
                        />
                      ))}
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map((n) => (
                        <motion.div
                          key={n}
                          className="rounded-xl bg-background/50 border border-border/50"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: n * 0.12 + 0.3, duration: 0.4 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-8">
            {FEATURES.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="cursor-pointer relative w-8 h-2 rounded-full overflow-hidden bg-border"
                aria-label={`Go to feature ${i + 1}`}
              >
                {i === active && (
                  <motion.div
                    className="absolute inset-0 bg-primary rounded-full"
                    layoutId="demo-progress"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
