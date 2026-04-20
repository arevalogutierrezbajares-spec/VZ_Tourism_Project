'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, MapPin, Shield, Sparkles, Star, Users, ChevronDown } from 'lucide-react';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';
import { MobileTabBar } from '@/components/common/MobileTabBar';

const HERO_IMAGES = [
  '/hero/city_skyline.jpg',
  '/hero/amacer-en-el-avila-vista.jpg',
];

const STATS = [
  { value: '800+', label: 'Experiences' },
  { value: '24', label: 'Regions' },
  { value: '4.8', label: 'Avg Rating', icon: Star },
  { value: '100%', label: 'Verified Providers' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Tell us your dream',
    description: 'Share where you want to go, what you want to feel, and how long you have. Our AI builds a custom itinerary in seconds.',
  },
  {
    step: '02',
    title: 'Book with confidence',
    description: 'Every provider is locally verified. Real photos, real reviews, real prices. No surprises on arrival.',
  },
  {
    step: '03',
    title: 'Travel with support',
    description: 'WhatsApp concierge, safety zones, and local contacts. You are never alone in Venezuela.',
  },
];

const EDITORIAL_PICKS = [
  {
    title: 'Los Roques',
    subtitle: 'Caribbean perfection',
    description: 'Turquoise water, white sand, and nothing else. The archipelago that makes the Maldives jealous.',
    image: '/destinations/los roques1.jpg',
    href: '/library/region/los-roques',
    size: 'large' as const,
  },
  {
    title: 'Merida',
    subtitle: 'Andes adventure capital',
    description: 'Teleferico to 4,765m. Páramo hikes. Coffee farms. The adventure hub of South America.',
    image: '/destinations/merida.jpg',
    href: '/library/region/merida',
    size: 'medium' as const,
  },
  {
    title: 'Canaima & Angel Falls',
    subtitle: 'The world\'s highest waterfall',
    description: '979 meters of free-falling water in the heart of the Gran Sabana.',
    image: '/destinations/angel-falls-tour.jpg',
    href: '/library/region/canaima',
    size: 'medium' as const,
  },
];

const CATEGORIES = [
  { label: 'Beaches', href: '/library/category/beaches', icon: '🏖' },
  { label: 'Mountains', href: '/library/category/mountains', icon: '⛰' },
  { label: 'Cities', href: '/library/category/cities', icon: '🏙' },
  { label: 'Eco-tours', href: '/library/category/eco-tours', icon: '🌿' },
  { label: 'Gastronomy', href: '/library/category/gastronomy', icon: '🍽' },
  { label: 'Adventure', href: '/library/category/adventure', icon: '🧗' },
  { label: 'Wellness', href: '/library/category/wellness', icon: '🧘' },
  { label: 'Cultural', href: '/library/category/cultural', icon: '🎭' },
];

export default function LandingPage() {
  const [activeImage, setActiveImage] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setActiveImage((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col pb-16 md:pb-0">
      <Navbar />
      <main id="main">

      {/* === HERO === */}
      <section ref={heroRef} className="relative h-[calc(100svh-4rem)] min-h-[560px] bg-black overflow-hidden">
        {/* Background images with crossfade */}
        {HERO_IMAGES.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 transition-opacity duration-[2000ms] ease-in-out"
            style={{
              opacity: activeImage === i ? 1 : 0,
              transform: activeImage === i ? 'scale(1.05)' : 'scale(1)',
              transition: 'opacity 2000ms ease-in-out, transform 12000ms ease-out',
            }}
          >
            <Image
              src={src}
              alt="Venezuela landscape"
              fill
              className="object-cover"
              priority={i === 0}
              sizes="100vw"
            />
          </div>
        ))}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/70" />

        {/* Hero content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 text-center">
          <div
            className="transition-all duration-1000 ease-out"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(32px)',
            }}
          >
            <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-normal text-white tracking-tight leading-[0.9]"
              style={{ textShadow: '0 2px 24px rgba(0,0,0,0.3)' }}
            >
              Venezuela,
              <br />
              <span className="italic">Rediscovered</span>
            </h1>
          </div>

          <p
            className="mt-6 text-lg sm:text-xl text-white/80 max-w-lg font-light leading-relaxed"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
              transition: 'all 1000ms ease-out 300ms',
              textShadow: '0 1px 12px rgba(0,0,0,0.3)',
            }}
          >
            The last frontier of South American travel.
            AI-powered itineraries, verified local providers, and safety you can trust.
          </p>

          <div
            className="mt-10 flex flex-col sm:flex-row gap-4"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
              transition: 'all 1000ms ease-out 600ms',
            }}
          >
            <Link
              href="/plan"
              className="inline-flex items-center gap-2.5 px-8 py-4 bg-accent text-accent-foreground font-semibold rounded-lg text-base hover:brightness-110 transition-all shadow-lg hover:shadow-xl"
            >
              <Sparkles className="w-5 h-5" />
              Plan my trip with AI
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2.5 px-8 py-4 border-2 border-white/40 text-white font-medium rounded-lg text-base hover:bg-white/10 transition-all backdrop-blur-sm"
            >
              Explore Venezuela
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-white/50" />
        </div>
      </section>

      {/* === TRUST BRIDGE === */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
            How it works
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl text-center mb-16 text-foreground">
            From dream to departure in three steps
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="text-center md:text-left">
                <span className="font-heading text-5xl text-accent/30 block mb-4">
                  {item.step}
                </span>
                <h3 className="text-xl font-semibold mb-3 text-foreground">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === STATS STRIP === */}
      <section className="border-y bg-muted/30">
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                {stat.icon && <stat.icon className="w-5 h-5 text-accent fill-accent" />}
                <span className="font-heading text-3xl text-foreground">{stat.value}</span>
              </div>
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* === EDITORIAL PICKS (asymmetric magazine layout) === */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
            Curated by locals
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl mb-12 text-foreground">
            Where to begin
          </h2>

          {/* Asymmetric grid: 1 large + 2 medium */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Large feature card */}
            <Link
              href={EDITORIAL_PICKS[0].href}
              className="group relative rounded-2xl overflow-hidden aspect-[4/5] lg:row-span-2"
            >
              <Image
                src={EDITORIAL_PICKS[0].image}
                alt={EDITORIAL_PICKS[0].title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6 sm:p-8">
                <p className="text-sm font-medium text-white/60 uppercase tracking-wider mb-2">
                  {EDITORIAL_PICKS[0].subtitle}
                </p>
                <h3 className="font-heading text-3xl sm:text-4xl text-white mb-3">
                  {EDITORIAL_PICKS[0].title}
                </h3>
                <p className="text-white/70 max-w-md leading-relaxed">
                  {EDITORIAL_PICKS[0].description}
                </p>
              </div>
            </Link>

            {/* Two medium cards stacked */}
            {EDITORIAL_PICKS.slice(1).map((pick) => (
              <Link
                key={pick.title}
                href={pick.href}
                className="group relative rounded-2xl overflow-hidden aspect-[16/9]"
              >
                <Image
                  src={pick.image}
                  alt={pick.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-5 sm:p-6">
                  <p className="text-xs font-medium text-white/60 uppercase tracking-wider mb-1.5">
                    {pick.subtitle}
                  </p>
                  <h3 className="font-heading text-2xl text-white mb-1.5">
                    {pick.title}
                  </h3>
                  <p className="text-white/70 text-sm max-w-sm">
                    {pick.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* === CATEGORY STRIP (Airbnb-style icon row) === */}
      <section className="border-y bg-background">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center gap-6 overflow-x-auto scrollbar-none pb-1">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.label}
                href={cat.href}
                className="flex flex-col items-center gap-2 min-w-[72px] text-center group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">
                  {cat.icon}
                </span>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors whitespace-nowrap">
                  {cat.label}
                </span>
              </Link>
            ))}
            <Link
              href="/explore"
              className="flex flex-col items-center gap-2 min-w-[72px] text-center group"
            >
              <span className="w-8 h-8 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center group-hover:border-foreground transition-colors">
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </span>
              <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors whitespace-nowrap">
                See all
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* === AI PLANNER TEASER === */}
      <section className="py-20 px-6 bg-muted/20">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              AI-powered
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl mb-5 text-foreground">
              Your itinerary, built in seconds
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Tell our AI where you want to go and how long you have.
              It builds a day-by-day itinerary with real places, real prices,
              and safety information... all in under 30 seconds.
            </p>
            <Link
              href="/plan"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-foreground text-background font-semibold rounded-lg hover:bg-foreground/90 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Start planning
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Preview card */}
          <div className="flex-1 max-w-sm w-full">
            <div className="bg-background border rounded-2xl shadow-lg p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold">7 days in Venezuela</p>
                  <p className="text-xs text-muted-foreground">Beaches + Mountains</p>
                </div>
              </div>
              <div className="space-y-2.5">
                {['Day 1-3: Los Roques archipelago', 'Day 4-5: Merida & Teleferico', 'Day 6-7: Choroni coastal town'].map((day) => (
                  <div key={day} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                    <p className="text-sm text-muted-foreground">{day}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2 border-t">
                <Shield className="w-4 h-4 text-secondary" />
                <span className="text-xs text-muted-foreground">Safety zones verified</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* === SOCIAL PROOF === */}
      <section className="py-16 px-6 bg-background">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-3xl sm:text-4xl mb-4 text-foreground">
            Trusted by travelers
          </h2>
          <p className="text-muted-foreground mb-12 max-w-2xl mx-auto">
            Venezuela is safe when you travel smart. Our verified providers and AI safety tools
            give you confidence to explore one of South America&apos;s most spectacular countries.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="font-semibold">Verified providers</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every provider is locally vetted. Real businesses, real insurance, real accountability.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold">Safety zones</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Real-time safety data for every region. Know before you go. Travel with eyes open.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold">WhatsApp support</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                24/7 concierge via WhatsApp. Local contacts in every region. Never lost, never alone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* === CTA BANNER === */}
      <section className="relative py-20 px-6 overflow-hidden">
        <Image
          src="/destinations/morrocoy.jpg"
          alt="Morrocoy National Park"
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="font-heading text-3xl sm:text-4xl text-white mb-5">
            Ready to discover Venezuela?
          </h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">
            Start with our AI trip planner. It&apos;s free, takes 30 seconds,
            and gives you a complete day-by-day itinerary.
          </p>
          <Link
            href="/plan"
            className="inline-flex items-center gap-2.5 px-8 py-4 bg-white text-foreground font-semibold rounded-lg hover:bg-white/90 transition-colors shadow-lg"
          >
            <Sparkles className="w-5 h-5" />
            Plan my trip
          </Link>
        </div>
      </section>

      </main>
      <Footer className="hidden md:block" />
      <MobileTabBar />
    </div>
  );
}
