'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Users, TrendingUp, BadgeCheck, DollarSign } from 'lucide-react';

const CREATOR_BENEFITS = [
  {
    icon: Users,
    title: 'Audience reach',
    description:
      'Creators bring their followers directly to your posada through curated itineraries and recommendations.',
  },
  {
    icon: TrendingUp,
    title: 'Commission tracking',
    description:
      'Every booking traced to the creator who drove it. Transparent analytics for everyone in the chain.',
  },
  {
    icon: BadgeCheck,
    title: 'Verified trust',
    description:
      'Verified creator badges and follower counts build social proof that converts browsers into bookers.',
  },
  {
    icon: DollarSign,
    title: 'Revenue share',
    description:
      'Creators earn commission on bookings. More incentive to promote your property to their audience.',
  },
];

const SAMPLE_CREATORS = [
  {
    name: 'Maria Fernanda',
    handle: '@mariafertravel',
    followers: '45.2K',
    avatar: 'MF',
    color: 'oklch(0.55 0.18 220)',
  },
  {
    name: 'Carlos Aventura',
    handle: '@carlosvenezuela',
    followers: '128K',
    avatar: 'CA',
    color: 'oklch(0.65 0.15 142)',
  },
  {
    name: 'Ana Roques',
    handle: '@ana.losroques',
    followers: '67.8K',
    avatar: 'AR',
    color: 'oklch(0.7 0.15 75)',
  },
];

export function CreatorProgram() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="creators" className="py-24 sm:py-32 bg-muted/30">
      <div className="max-w-6xl mx-auto px-5" ref={ref}>
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <p className="text-sm font-medium tracking-[0.15em] uppercase text-primary mb-3">
              Creator Ecosystem
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
              Create. Inspire.{' '}
              <span className="text-transparent bg-clip-text" style={{
                backgroundImage: 'linear-gradient(135deg, oklch(0.7 0.15 75), oklch(0.65 0.18 55))',
              }}>
                Earn.
              </span>
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Travel creators and influencers build itineraries featuring your
              posada, driving their audience directly to your booking page.
              It is organic marketing powered by people who already have the
              trust of your ideal guests.
            </p>

            <div className="grid sm:grid-cols-2 gap-5">
              {CREATOR_BENEFITS.map((benefit, i) => {
                const Icon = benefit.icon;
                return (
                  <motion.div
                    key={benefit.title}
                    className="flex gap-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: i * 0.1 + 0.3 }}
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        {benefit.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {benefit.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Right: Creator cards */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="space-y-4">
              {SAMPLE_CREATORS.map((creator, i) => (
                <motion.div
                  key={creator.handle}
                  className="flex items-center gap-4 p-4 rounded-xl bg-background border hover:shadow-md transition-shadow duration-300 cursor-pointer"
                  initial={{ opacity: 0, x: 30 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: i * 0.12 + 0.4 }}
                  whileHover={{ x: 4 }}
                >
                  {/* Avatar */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ring-2 ring-primary"
                    style={{
                      backgroundColor: creator.color,
                    }}
                  >
                    {creator.avatar}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {creator.name}
                      </span>
                      <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {creator.handle}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-foreground">
                      {creator.followers}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      followers
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Decorative gradient blob */}
            <div
              className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full opacity-20 blur-3xl"
              style={{
                background:
                  'radial-gradient(circle, oklch(0.55 0.18 220) 0%, transparent 70%)',
              }}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
