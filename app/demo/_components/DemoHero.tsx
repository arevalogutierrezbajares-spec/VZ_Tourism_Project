'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
} from 'framer-motion';

const ROTATING_WORDS = [
  'Discover',
  'Experience',
  'Explore',
  'Book',
];

const HERO_IMAGES = [
  '/hero/amacer-en-el-avila-vista.jpg',
  '/hero/beach.jpg',
  '/hero/adventure.jpg',
  '/hero/nature_tour.webp',
];

export function DemoHero() {
  const [wordIndex, setWordIndex] = useState(0);
  const [imgIndex, setImgIndex] = useState(0);
  // Track which images have ever been active so we only fetch them when first needed.
  // Image 0 is always included (it's the LCP element).
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([0]));
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 600], [0, 150]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);

  const nextWord = useCallback(() => {
    setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
  }, []);

  useEffect(() => {
    const interval = setInterval(nextWord, 2800);
    return () => clearInterval(interval);
  }, [nextWord]);

  useEffect(() => {
    const interval = setInterval(() => {
      setImgIndex((prev) => {
        const next = (prev + 1) % HERO_IMAGES.length;
        setLoadedImages((s) => new Set([...s, next]));
        return next;
      });
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const scrollTo = (id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative h-svh min-h-[600px] w-full overflow-hidden bg-foreground">
      {/* Parallax background images */}
      <motion.div className="absolute inset-0" style={{ y: bgY }}>
        {HERO_IMAGES.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 transition-opacity duration-[2000ms] ease-in-out"
            style={{ opacity: i === imgIndex ? 1 : 0 }}
          >
            {/* Only mount an image once it has been (or is about to be) active.
                This prevents the browser from fetching all 4 images on initial load.
                Image 0 is always mounted — it is the LCP element. */}
            {loadedImages.has(i) && (
              // Extra-tall wrapper so the parallax translate has room without
              // exposing the section background at the bottom.
              <div className="relative w-full h-[120%]">
                <Image
                  src={src}
                  alt=""
                  fill
                  priority={i === 0}
                  sizes="(max-width: 768px) 100vw, 100vw"
                  className="object-cover"
                  style={{
                    transform: i === imgIndex ? 'scale(1.05)' : 'scale(1)',
                    transition: 'transform 8s ease-out',
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </motion.div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/70" />

      {/* Scan lines texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
        }}
      />

      {/* Content */}
      <motion.div
        className="relative z-10 flex flex-col items-center justify-center h-full px-5 text-center"
        style={{ opacity }}
      >
        {/* Eyebrow */}
        <motion.p
          className="text-white/60 text-sm sm:text-base font-medium tracking-[0.2em] uppercase mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Venezuela Tourism Platform
        </motion.p>

        {/* Main headline with morphing word */}
        <motion.h1
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight leading-[1.05]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <span className="block h-[1.15em] relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.span
                key={wordIndex}
                className="inline-block text-transparent bg-clip-text"
                style={{
                  backgroundImage:
                    'linear-gradient(135deg, oklch(0.55 0.18 220), oklch(0.65 0.15 142))',
                }}
                initial={{ opacity: 0, y: 40, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -40, filter: 'blur(8px)' }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                {ROTATING_WORDS[wordIndex]}
              </motion.span>
            </AnimatePresence>
          </span>
          <span className="block">Venezuela.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="mt-6 text-lg sm:text-xl text-white/75 max-w-lg font-light leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
        >
          The all-in-one platform connecting travelers with authentic
          Venezuelan experiences — from Caribbean coasts to Andean peaks.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="mt-10 flex flex-col sm:flex-row gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          <button
            onClick={() => scrollTo('#platform')}
            className="px-8 py-3.5 bg-white text-foreground font-semibold rounded-full text-base cursor-pointer hover:bg-white/90 transition-all duration-200 shadow-lg shadow-black/20"
          >
            See the Platform
          </button>
          <button
            onClick={() => scrollTo('#posadas')}
            className="px-8 py-3.5 border-2 border-white/30 text-white font-semibold rounded-full text-base cursor-pointer hover:border-white/60 hover:bg-white/10 transition-all duration-200"
          >
            List Your Property
          </button>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          className="mt-16 flex gap-8 sm:gap-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.3 }}
        >
          {[
            { value: '8+', label: 'Destinations' },
            { value: '200+', label: 'Experiences' },
            { value: '50+', label: 'Creators' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white">
                {stat.value}
              </p>
              <p className="text-xs sm:text-sm text-white/50 mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <motion.div
          className="w-6 h-10 rounded-full border-2 border-white/25 flex items-start justify-center pt-2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-1.5 h-2.5 rounded-full bg-white/50" />
        </motion.div>
      </motion.div>
    </section>
  );
}
