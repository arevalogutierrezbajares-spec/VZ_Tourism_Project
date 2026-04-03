'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { MapPin, Heart, Plus, Compass, Waves, Mountain, Building2, Utensils, Zap, Bird } from 'lucide-react';

const Instagram = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
);
import { PhotoModal } from './PhotoModal';
import type { DiscoverItem } from './types';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: <Compass className="w-3.5 h-3.5" /> },
  { id: 'beach', label: 'Beaches', icon: <Waves className="w-3.5 h-3.5" /> },
  { id: 'mountain', label: 'Mountains', icon: <Mountain className="w-3.5 h-3.5" /> },
  { id: 'city', label: 'Cities', icon: <Building2 className="w-3.5 h-3.5" /> },
  { id: 'food', label: 'Food & Drink', icon: <Utensils className="w-3.5 h-3.5" /> },
  { id: 'activity', label: 'Adventures', icon: <Zap className="w-3.5 h-3.5" /> },
  { id: 'nature', label: 'Wildlife', icon: <Bird className="w-3.5 h-3.5" /> },
];

const CATEGORY_ICONS: Record<string, string> = {
  beach: '🏖️',
  mountain: '⛰️',
  city: '🏙️',
  food: '🍽️',
  activity: '🎒',
  nature: '🌿',
};

interface DiscoverGridProps {
  items: DiscoverItem[];
}

// Renders an embedded Instagram post and loads the IG embed script once
function InstagramCard({ item }: { item: DiscoverItem }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // If the instagram embed script is already loaded, just call process()
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).instgrm) {
      ((window as unknown as Record<string, unknown>).instgrm as { Embeds: { process: () => void } }).Embeds.process();
      setLoaded(true);
      return;
    }
    // Load the embed script once
    const existing = document.querySelector('script[src*="instagram.com/embed.js"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://www.instagram.com/embed.js';
      script.async = true;
      script.onload = () => setLoaded(true);
      document.body.appendChild(script);
    } else {
      setLoaded(true);
    }
  }, []);

  // If we have the raw embed HTML, use it
  const embedHtml = (item as unknown as Record<string, string>).instagram_embed_html;
  if (embedHtml) {
    return (
      <div
        ref={containerRef}
        className="w-full bg-white"
        dangerouslySetInnerHTML={{ __html: embedHtml }}
      />
    );
  }

  // Fallback: show thumbnail with IG badge
  return (
    <div className="relative w-full" style={{ aspectRatio: '1 / 1.25' }}>
      {item.url ? (
        <img src={item.url} alt={item.caption} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
          <Instagram className="w-12 h-12 text-purple-300" />
        </div>
      )}
      <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}>
        <Instagram className="w-3.5 h-3.5 text-white" />
      </div>
    </div>
  );
}

function PhotoCard({
  item,
  onOpen,
}: {
  item: DiscoverItem;
  onOpen: (item: DiscoverItem) => void;
}) {
  const [saved, setSaved] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative rounded-2xl overflow-hidden cursor-pointer group"
      style={{
        breakInside: 'avoid',
        marginBottom: '16px',
        transform: hovered ? 'scale(1.02)' : 'scale(1)',
        boxShadow: hovered
          ? '0 20px 40px -8px rgba(0,0,0,0.28), 0 4px 12px -2px rgba(0,0,0,0.15)'
          : '0 2px 8px -2px rgba(0,0,0,0.12)',
        transition: 'transform 200ms ease-out, box-shadow 200ms ease-out',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen(item)}
    >
      {/* Photo or Instagram embed */}
      {item.instagram_embed_url || item.instagram_post_url ? (
        <InstagramCard item={item} />
      ) : (
        <img
          src={item.url}
          alt={item.caption}
          loading="lazy"
          className="w-full h-auto block"
          style={{ display: 'block' }}
        />
      )}

      {/* Category icon top-left */}
      <div className="absolute top-3 left-3">
        <span
          className="text-sm px-2 py-1 rounded-full"
          style={{ background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(6px)', color: 'white', fontSize: '14px' }}
        >
          {CATEGORY_ICONS[item.category]}
        </span>
      </div>

      {/* Save button top-right — appears on hover */}
      <button
        className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200"
        style={{
          background: saved ? '#ef4444' : 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(6px)',
          opacity: hovered || saved ? 1 : 0,
          transform: hovered || saved ? 'scale(1)' : 'scale(0.8)',
          transition: 'opacity 200ms ease-out, transform 200ms ease-out, background 150ms',
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSaved((s) => !s);
        }}
        aria-label={saved ? 'Remove from saved' : 'Save'}
      >
        <Heart
          className="w-4 h-4"
          fill={saved ? 'white' : 'none'}
          strokeWidth={saved ? 0 : 2}
          style={{ color: saved ? 'white' : '#6b7280' }}
        />
      </button>

      {/* Bottom gradient overlay */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: '65%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.28) 50%, transparent 100%)',
        }}
      />

      {/* Caption + location */}
      <div className="absolute bottom-0 left-0 right-0 p-3.5">
        <p className="text-white text-sm font-semibold leading-snug mb-1.5 drop-shadow">
          {item.caption}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-white/80 text-xs">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span>{item.region_name}</span>
          </div>
          {/* "Add to trip" button — appears on hover */}
          <button
            className="flex items-center gap-1 text-white text-xs font-semibold px-2.5 py-1 rounded-full transition-all duration-200"
            style={{
              background: 'rgba(29, 78, 216, 0.88)',
              backdropFilter: 'blur(4px)',
              opacity: hovered ? 1 : 0,
              transform: hovered ? 'translateY(0)' : 'translateY(4px)',
              transition: 'opacity 200ms ease-out, transform 200ms ease-out',
            }}
            onClick={(e) => {
              e.stopPropagation();
              // Could open trip planner — for now just visual feedback
            }}
          >
            <Plus className="w-3 h-3" />
            Add to Trip
          </button>
        </div>
      </div>

      {/* Featured badge */}
      {item.featured && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', whiteSpace: 'nowrap' }}
          >
            ✦ Featured
          </span>
        </div>
      )}
    </div>
  );
}

export function DiscoverGrid({ items }: DiscoverGridProps) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState<DiscoverItem | null>(null);
  const [savedTrip, setSavedTrip] = useState<DiscoverItem[]>([]);

  const filtered = activeCategory === 'all'
    ? items
    : items.filter((item) => item.category === activeCategory);

  const handleAddToTrip = useCallback((item: DiscoverItem) => {
    setSavedTrip((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev;
      return [...prev, item];
    });
    setSelectedItem(null);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: '#f8f9fa' }}>
      {/* Hero section */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
          minHeight: '320px',
        }}
      >
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
        {/* Gradient orbs */}
        <div
          className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent)', transform: 'translate(-50%, -50%)' }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #f59e0b, transparent)', transform: 'translate(50%, 50%)' }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 text-blue-300 text-sm font-medium mb-4 px-4 py-1.5 rounded-full"
            style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>
            <span>✦</span>
            <span>Visual Discovery</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
            Discover{' '}
            <span style={{ background: 'linear-gradient(135deg, #60a5fa, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Venezuela
            </span>
          </h1>
          <p className="text-lg text-blue-100/80 max-w-xl mx-auto">
            Let the beauty inspire your next adventure
          </p>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="sticky top-16 z-30 border-b" style={{ background: 'rgba(248,249,250,0.95)', backdropFilter: 'blur(12px)', borderColor: '#e5e7eb' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
            {CATEGORIES.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setActiveCategory(id)}
                className="flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex-shrink-0"
                style={
                  activeCategory === id
                    ? {
                        background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                        color: 'white',
                        boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
                      }
                    : {
                        background: 'white',
                        color: '#6b7280',
                        border: '1px solid #e5e7eb',
                      }
                }
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <p className="text-sm text-gray-500">
          {filtered.length} photo{filtered.length !== 1 ? 's' : ''}
          {activeCategory !== 'all' && ` in ${CATEGORIES.find((c) => c.id === activeCategory)?.label}`}
        </p>
      </div>

      {/* Masonry grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div
          style={{
            columns: '4 280px',
            columnGap: '16px',
          }}
        >
          {filtered.map((item) => (
            <PhotoCard
              key={item.id}
              item={item}
              onOpen={setSelectedItem}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-24">
            <p className="text-4xl mb-4">📷</p>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No photos found</h3>
            <p className="text-gray-500">Try a different category.</p>
          </div>
        )}
      </div>

      {/* Trip tray (if items saved) */}
      {savedTrip.length > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <span className="text-lg">🗺️</span>
          <span className="text-sm font-semibold">
            {savedTrip.length} location{savedTrip.length !== 1 ? 's' : ''} saved to trip
          </span>
          <a
            href={`/?q=${encodeURIComponent('Plan my Venezuela trip')}`}
            className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors hover:opacity-90"
            style={{ background: 'rgba(59,130,246,0.8)' }}
          >
            Plan now →
          </a>
          <button
            onClick={() => setSavedTrip([])}
            className="text-white/50 hover:text-white text-xs ml-1 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Modal */}
      {selectedItem && (
        <PhotoModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAddToTrip={handleAddToTrip}
        />
      )}
    </div>
  );
}
