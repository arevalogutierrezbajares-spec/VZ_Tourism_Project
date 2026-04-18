'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

function AnimatedCounter({
  target,
  suffix = '',
  duration = 2,
}: {
  target: number;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const step = target / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [isInView, target, duration]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

export function FinalCTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section className="py-24 sm:py-32 bg-foreground text-background" ref={ref}>
      <div className="max-w-4xl mx-auto px-5 text-center">
        {/* Stats */}
        <motion.div
          className="grid grid-cols-3 gap-8 mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          {[
            { target: 200, suffix: '+', label: 'Experiences listed' },
            { target: 8, suffix: '+', label: 'Destinations covered' },
            { target: 50, suffix: '+', label: 'Active creators' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-background">
                <AnimatedCounter
                  target={stat.target}
                  suffix={stat.suffix}
                />
              </p>
              <p className="text-sm text-background/50 mt-2">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* CTA content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Your next guest is browsing right now
          </h2>
          <p className="text-background/60 text-lg max-w-xl mx-auto mb-10">
            Every day travelers discover Venezuela through VZ Explorer. Make
            sure they can find — and book — your posada.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/provider-register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-foreground font-semibold rounded-full text-base hover:bg-white/90 transition-all duration-200 shadow-lg group"
            >
              List Your Posada
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="mailto:team@vzexplorer.com"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-background/20 text-background font-semibold rounded-full text-base hover:border-background/40 hover:bg-background/5 transition-all duration-200"
            >
              Contact Us
            </a>
          </div>

          <p className="mt-8 text-sm text-background/40">
            Free to list &middot; No upfront costs &middot; Pay only when you earn
          </p>
        </motion.div>
      </div>
    </section>
  );
}
