'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Globe,
  BarChart3,
  ShieldCheck,
  Users,
  CreditCard,
  Headphones,
} from 'lucide-react';

const BENEFITS = [
  {
    icon: Globe,
    title: 'Reach international travelers',
    description:
      'Your posada appears in front of travelers from the US, Europe, and Latin America who are actively planning Venezuela trips.',
  },
  {
    icon: ShieldCheck,
    title: 'Safety-verified platform',
    description:
      'Our safety zones system gives travelers the confidence to book. Properties in green zones see 3x more bookings.',
  },
  {
    icon: Users,
    title: 'Creator-driven traffic',
    description:
      'Influencers feature your property in curated itineraries, driving their audience directly to your listing.',
  },
  {
    icon: BarChart3,
    title: 'Provider dashboard',
    description:
      'Track bookings, manage availability, view analytics, and respond to inquiries — all from one dashboard.',
  },
  {
    icon: CreditCard,
    title: 'Secure payments',
    description:
      'Stripe and Zelle payment processing. You receive payouts directly — no chasing payments from guests.',
  },
  {
    icon: Headphones,
    title: 'Dedicated support',
    description:
      'Our team helps with onboarding, photography guidance, listing optimization, and guest communication.',
  },
];

export function PosadaOwners() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="posadas" className="py-24 sm:py-32 bg-background">
      <div className="max-w-6xl mx-auto px-5" ref={ref}>
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sm font-medium tracking-[0.15em] uppercase text-primary mb-3">
            For Posada Owners
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            List your property.{' '}
            <span className="text-transparent bg-clip-text" style={{
              backgroundImage: 'linear-gradient(135deg, oklch(0.55 0.18 220), oklch(0.65 0.15 142))',
            }}>
              Grow your business.
            </span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
            Join the platform that is putting Venezuelan posadas on the map for
            international travelers
          </p>
        </motion.div>

        {/* Benefits grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {BENEFITS.map((benefit, i) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={benefit.title}
                className="group p-6 rounded-2xl border bg-background hover:shadow-lg transition-all duration-300 cursor-pointer"
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.08 + 0.2 }}
                whileHover={{ y: -4 }}
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors duration-300">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {benefit.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* CTA banner */}
        <motion.div
          className="relative rounded-3xl overflow-hidden p-8 sm:p-12"
          style={{
            background:
              'linear-gradient(135deg, oklch(0.55 0.18 220), oklch(0.45 0.18 220))',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div className="relative z-10 text-center max-w-xl mx-auto">
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Ready to get started?
            </h3>
            <p className="text-white/70 mb-8">
              Join VZ Explorer today. Free to list, you only pay when you earn.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/provider-register"
                className="px-8 py-3.5 bg-white text-foreground font-semibold rounded-full text-base hover:bg-white/90 transition-all duration-200 shadow-lg"
              >
                List Your Posada
              </a>
              <a
                href="#how-it-works"
                className="px-8 py-3.5 border-2 border-white/30 text-white font-semibold rounded-full text-base hover:border-white/60 hover:bg-white/10 transition-all duration-200"
              >
                Learn More
              </a>
            </div>
          </div>

          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/3" />
        </motion.div>
      </div>
    </section>
  );
}
