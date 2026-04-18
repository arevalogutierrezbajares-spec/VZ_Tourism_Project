'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const PLACEHOLDER_PARTNERS = [
  'TripAdvisor',
  'Google Travel',
  'Lonely Planet',
  'Booking.com',
  'Viator',
  'GetYourGuide',
];

const PLACEHOLDER_TESTIMONIALS = [
  {
    quote:
      'VZ Explorer made it possible for us to reach travelers we never could have found on our own. Our bookings doubled in the first quarter.',
    name: 'Posada Owner',
    location: 'Los Roques',
    initials: 'PO',
  },
  {
    quote:
      'The safety zones feature was the game-changer. Travelers finally have the confidence to book Venezuela, and we are the ones benefiting.',
    name: 'Tour Operator',
    location: 'Mérida',
    initials: 'TO',
  },
  {
    quote:
      'Being featured in a creator itinerary brought 40 new bookings in one month. The influencer model really works.',
    name: 'Eco-Lodge Manager',
    location: 'Canaima',
    initials: 'EM',
  },
];

export function SocialProof() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section className="py-24 sm:py-32 bg-muted/30">
      <div className="max-w-6xl mx-auto px-5" ref={ref}>
        {/* Testimonials */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sm font-medium tracking-[0.15em] uppercase text-primary mb-3">
            Early Partners
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            What our partners are saying
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {PLACEHOLDER_TESTIMONIALS.map((testimonial, i) => (
            <motion.div
              key={testimonial.name}
              className="p-6 rounded-2xl bg-background border"
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 + 0.2 }}
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className="w-4 h-4 fill-amber-400"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-4 italic">
                &ldquo;{testimonial.quote}&rdquo;
              </p>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {testimonial.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {testimonial.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.location}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Partner logos placeholder */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-8">
            Future integration partners
          </p>
          <div className="flex flex-wrap justify-center gap-8 sm:gap-12">
            {PLACEHOLDER_PARTNERS.map((partner) => (
              <div
                key={partner}
                className="text-lg font-semibold text-muted-foreground/30 select-none"
              >
                {partner}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
