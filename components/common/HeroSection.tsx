'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Sparkles, ChevronDown } from 'lucide-react';
import { BuildItineraryModal } from '@/components/itinerary/BuildItineraryModal';

const WORDS = ['Discover', 'Explore', 'Experience', 'Uncover'];

const HERO_IMAGES = [
  {
    src: '/hero/city_skyline.jpg',
    alt: 'Caracas city skyline',
  },
  {
    src: '/hero/amacer-en-el-avila-vista.jpg',
    alt: 'Sunrise over El Avila mountain in Caracas',
  },
];

export function HeroSection() {
  const [wordIndex, setWordIndex] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Cycle the animated word
  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % WORDS.length);
        setIsVisible(true);
      }, 400);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Crossfade background images
  useEffect(() => {
    const interval = setInterval(() => {
      setImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Stagger CTA entrance after headline settles
  useEffect(() => {
    const t = setTimeout(() => setCtaVisible(true), 900);
    return () => clearTimeout(t);
  }, []);

  function scrollToCategories() {
    document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <>
      <section className="relative h-[calc(100svh-4rem)] min-h-[560px] w-full overflow-hidden bg-black">
        {/* Background images with crossfade + Ken Burns */}
        {HERO_IMAGES.map(({ src, alt }, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-[2000ms] ease-in-out"
            style={{ opacity: i === imageIndex ? 1 : 0 }}
          >
            <Image
              src={src}
              alt={alt}
              fill
              sizes="100vw"
              priority={i === 0}
              className="object-cover transition-transform duration-[800ms] ease-out motion-reduce:transition-none"
              style={{ transform: i === imageIndex ? 'scale(1.08)' : 'scale(1)' }}
            />
          </div>
        ))}

        {/* Gradient overlay — heavier at bottom to give CTAs legible bg */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/75" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 text-center">
          {/* Headline */}
          <h1
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold font-heading text-white tracking-tight leading-tight"
            style={{ textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}
          >
            <span className="block">
              <span
                className="inline-block transition-all duration-400 ease-out"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(-20px)',
                }}
              >
                {WORDS[wordIndex]}
              </span>
            </span>
            <span className="block">Venezuela</span>
          </h1>

          {/* Tagline */}
          <p
            className="mt-5 text-lg sm:text-xl text-white/80 max-w-md font-light tracking-wide"
            style={{ textShadow: '0 1px 8px rgba(0,0,0,0.3)' }}
          >
            From pristine Caribbean beaches to Andean peaks
          </p>

          {/* CTAs */}
          <div
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 ease-out"
            style={{
              opacity: ctaVisible ? 1 : 0,
              transform: ctaVisible ? 'translateY(0)' : 'translateY(28px)',
            }}
          >
            {/* Primary — Build itinerary with AI */}
            <button
              onClick={() => setModalOpen(true)}
              className="group relative flex items-center gap-3 px-9 py-4 rounded-2xl font-bold text-base sm:text-lg bg-accent text-accent-foreground shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/40 hover:scale-105 active:scale-[1.02] transition-all duration-200 overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-black motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
            >
              <Sparkles className="w-5 h-5 flex-shrink-0 transition-transform group-hover:rotate-12 duration-300" />
              <span>Build my itinerary with AI</span>
              {/* Shimmer sweep on hover */}
              <span
                className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/35 to-transparent motion-reduce:hidden"
                aria-hidden="true"
              />
            </button>

            {/* Secondary — Explore */}
            <button
              onClick={scrollToCategories}
              className="flex items-center gap-2.5 px-9 py-4 rounded-2xl font-semibold text-base sm:text-lg text-white border-2 border-white/50 hover:border-white hover:bg-white/10 active:bg-white/15 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-2 focus:ring-offset-black"
            >
              Explore Venezuela
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Trust line */}
          <p
            className="mt-6 text-xs sm:text-sm text-white/50 transition-all duration-700 delay-200"
            style={{
              opacity: ctaVisible ? 1 : 0,
            }}
          >
            AI-powered itineraries · 800+ experiences · Local experts
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce motion-reduce:animate-none" aria-hidden="true">
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center pt-2">
            <div className="w-1.5 h-2.5 rounded-full bg-white/50" />
          </div>
        </div>
      </section>

      <BuildItineraryModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
