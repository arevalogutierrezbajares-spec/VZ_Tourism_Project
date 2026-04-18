'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Hotel,
  Compass,
  MapPin,
  Car,
  UtensilsCrossed,
  Waves,
  Mountain,
  TreePalm,
} from 'lucide-react';

const CATEGORIES = [
  {
    icon: Hotel,
    name: 'Posadas & Hotels',
    count: '80+',
    image: '/hero/Colonia_Tovar.jpg',
  },
  {
    icon: Compass,
    name: 'Adventures',
    count: '45+',
    image: '/hero/adventure.jpg',
  },
  {
    icon: Waves,
    name: 'Beach Experiences',
    count: '35+',
    image: '/hero/beach.jpg',
  },
  {
    icon: Mountain,
    name: 'Mountain Treks',
    count: '25+',
    image: '/hero/nature_tour.webp',
  },
  {
    icon: UtensilsCrossed,
    name: 'Gastronomy',
    count: '30+',
    image: '/hero/gastronomy.jpg',
  },
  {
    icon: MapPin,
    name: 'Guided Tours',
    count: '60+',
    image: '/destinations/angel-falls-tour.jpg',
  },
  {
    icon: Car,
    name: 'Transport',
    count: '15+',
    image: '/hero/city_skyline.jpg',
  },
  {
    icon: TreePalm,
    name: 'Eco-Tourism',
    count: '20+',
    image: '/hero/vzla_retreat.avif',
  },
];

export function BookingCategories() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section id="categories" className="py-24 sm:py-32 bg-background">
      <div className="max-w-6xl mx-auto px-5" ref={ref}>
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sm font-medium tracking-[0.15em] uppercase text-primary mb-3">
            Marketplace
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            Every category, one platform
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
            Travelers book lodging, activities, tours, and transport all in one place
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <motion.div
                key={cat.name}
                className="group relative rounded-2xl overflow-hidden aspect-[4/3] cursor-pointer"
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: 0.5,
                  delay: i * 0.07,
                  ease: 'easeOut',
                }}
                whileHover={{ y: -4 }}
              >
                {/* Background image */}
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                {/* Content */}
                <div className="relative z-10 h-full flex flex-col justify-end p-4">
                  <Icon className="w-5 h-5 text-white/80 mb-2" />
                  <h3 className="text-sm sm:text-base font-semibold text-white">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-white/60 mt-0.5">
                    {cat.count} listings
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
