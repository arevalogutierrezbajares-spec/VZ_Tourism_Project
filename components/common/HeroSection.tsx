'use client';

import { useState, useEffect } from 'react';

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

  useEffect(() => {
    const interval = setInterval(() => {
      setImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative h-[calc(100svh-4rem)] min-h-[500px] w-full overflow-hidden bg-black">
      {/* Background images with crossfade + Ken Burns */}
      {HERO_IMAGES.map(({ src, alt }, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-[2000ms] ease-in-out"
          style={{ opacity: i === imageIndex ? 1 : 0 }}
        >
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover transition-transform duration-[12000ms] ease-out"
            style={{ transform: i === imageIndex ? 'scale(1.08)' : 'scale(1)' }}
          />
        </div>
      ))}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/30 to-black/70" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">
        <h1
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight leading-tight text-center"
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
        <p
          className="mt-5 text-lg sm:text-xl text-white/80 max-w-md font-light tracking-wide text-center"
          style={{ textShadow: '0 1px 8px rgba(0,0,0,0.3)' }}
        >
          From pristine Caribbean beaches to Andean peaks
        </p>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center pt-2">
          <div className="w-1.5 h-2.5 rounded-full bg-white/50" />
        </div>
      </div>
    </section>
  );
}
