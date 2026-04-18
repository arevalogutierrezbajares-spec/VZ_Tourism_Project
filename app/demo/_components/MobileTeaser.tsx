'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Smartphone, Bell, MapPin, Calendar } from 'lucide-react';

const MOBILE_FEATURES = [
  { icon: Bell, label: 'Instant booking alerts' },
  { icon: MapPin, label: 'Offline maps & guides' },
  { icon: Calendar, label: 'Trip management' },
  { icon: Smartphone, label: 'Native experience' },
];

export function MobileTeaser() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="py-24 sm:py-32 bg-background overflow-hidden">
      <div className="max-w-6xl mx-auto px-5" ref={ref}>
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Phone mockup */}
          <motion.div
            className="relative flex justify-center"
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7 }}
          >
            {/* Phone frame */}
            <div className="relative w-[260px] h-[520px] rounded-[3rem] border-[8px] border-foreground/90 bg-foreground overflow-hidden shadow-2xl">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-foreground rounded-b-2xl z-10" />

              {/* Screen content */}
              <div className="w-full h-full bg-background rounded-[2.2rem] overflow-hidden">
                {/* Status bar */}
                <div className="h-12 bg-primary flex items-end justify-center pb-1">
                  <span className="text-[10px] text-white font-medium">
                    VZ Explorer
                  </span>
                </div>

                {/* Content skeleton */}
                <div className="p-4 space-y-3">
                  <div className="h-32 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-primary/40" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded-full w-3/4" />
                    <div className="h-3 bg-muted rounded-full w-1/2" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-20 rounded-lg bg-muted" />
                    <div className="h-20 rounded-lg bg-muted" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-20 rounded-lg bg-muted" />
                    <div className="h-20 rounded-lg bg-muted" />
                  </div>
                </div>

                {/* Bottom nav */}
                <div className="absolute bottom-0 left-0 right-0 h-14 border-t bg-background flex items-center justify-around px-6">
                  {['Home', 'Map', 'Trips', 'Profile'].map((tab) => (
                    <div key={tab} className="flex flex-col items-center gap-1">
                      <div className="w-4 h-4 rounded bg-muted" />
                      <span className="text-[8px] text-muted-foreground">
                        {tab}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Glow effect */}
            <div
              className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full opacity-15 blur-3xl"
              style={{
                background:
                  'radial-gradient(circle, oklch(0.55 0.18 220) 0%, transparent 70%)',
              }}
            />
          </motion.div>

          {/* Right: Content */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold uppercase tracking-wider mb-4">
              Coming Soon
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
              VZ Explorer for mobile
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Take the full platform on the road. Travelers will manage
              bookings, access offline guides, and get real-time safety
              updates — all from their phone. More access means more bookings
              for you.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {MOBILE_FEATURES.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.label}
                    className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30"
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: i * 0.1 + 0.4 }}
                  >
                    <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm text-foreground">
                      {feature.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            <p className="mt-8 text-sm text-muted-foreground">
              iOS & Android &middot; Q3 2026
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
