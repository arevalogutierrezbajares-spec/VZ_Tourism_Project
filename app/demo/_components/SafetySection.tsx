'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle, Eye } from 'lucide-react';

const SAFETY_LEVELS = [
  {
    level: 'Green',
    label: 'Safe Zone',
    description: 'Well-established tourism infrastructure, low risk',
    examples: 'Los Roques, Margarita, Mérida city center',
    color: 'oklch(0.65 0.15 142)',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
  },
  {
    level: 'Yellow',
    label: 'Caution',
    description: 'Generally safe with standard precautions needed',
    examples: 'Caracas (certain zones), Choroní, Morrocoy',
    color: 'oklch(0.7 0.15 75)',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
  },
  {
    level: 'Orange',
    label: 'Elevated',
    description: 'Travel with organized group or verified local guide required',
    examples: 'Rural areas, less-traveled corridors',
    color: 'oklch(0.65 0.18 55)',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
  },
  {
    level: 'Red',
    label: 'Avoid',
    description: 'Not recommended for tourism — listings restricted',
    examples: 'Border zones, restricted areas',
    color: 'oklch(0.577 0.245 27)',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
  },
];

const TRUST_STATS = [
  { icon: Shield, value: '100%', label: 'Listings safety-verified' },
  { icon: Eye, value: '24/7', label: 'Monitoring active' },
  { icon: CheckCircle, value: '8+', label: 'Verified safe destinations' },
  { icon: AlertTriangle, value: 'Real-time', label: 'Zone updates' },
];

export function SafetySection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="safety" className="py-24 sm:py-32 bg-foreground text-background">
      <div className="max-w-6xl mx-auto px-5" ref={ref}>
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sm font-medium tracking-[0.15em] uppercase text-primary mb-3">
            Safety First
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            The trust layer that drives bookings
          </h2>
          <p className="mt-4 text-background/60 text-lg max-w-2xl mx-auto">
            International travelers need confidence. Our safety zones system
            eliminates the #1 barrier to booking Venezuela — and that means more
            guests for you.
          </p>
        </motion.div>

        {/* Safety levels grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {SAFETY_LEVELS.map((level, i) => (
            <motion.div
              key={level.level}
              className={`p-5 rounded-xl border ${level.border} ${level.bg} backdrop-blur-sm`}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 + 0.2 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <motion.div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: level.color }}
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.3,
                  }}
                />
                <span
                  className="text-sm font-bold uppercase tracking-wide"
                  style={{ color: level.color }}
                >
                  {level.label}
                </span>
              </div>
              <p className="text-sm text-background/70 mb-2">
                {level.description}
              </p>
              <p className="text-xs text-background/40">{level.examples}</p>
            </motion.div>
          ))}
        </div>

        {/* Trust stats */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          {TRUST_STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="text-center p-6 rounded-xl border border-background/10"
              >
                <Icon className="w-6 h-6 mx-auto mb-3 text-primary" />
                <p className="text-2xl sm:text-3xl font-bold text-background">
                  {stat.value}
                </p>
                <p className="text-sm text-background/50 mt-1">{stat.label}</p>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
