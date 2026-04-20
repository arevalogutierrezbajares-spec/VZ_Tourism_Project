'use client';

import { useEffect, useRef, useState } from 'react';
import { X, MapPin, Plus, ChevronRight, ExternalLink } from 'lucide-react';

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
import type { DiscoverItem } from './types';

interface NearbyPost {
  id: string;
  url: string;
  caption: string;
  creator_handle?: string | null;
  instagram_post_url?: string | null;
  geo_label: string;
  source_type?: string;
}

interface PhotoModalProps {
  item: DiscoverItem;
  onClose: () => void;
  onAddToTrip: (item: DiscoverItem) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  beach: '🏖️',
  mountain: '⛰️',
  city: '🏙️',
  food: '🍽️',
  activity: '🎒',
  nature: '🌿',
};

const LOCATION_CATEGORY_LABELS: Record<string, string> = {
  viewpoint: '🔭 Viewpoint',
  beach_access: '🏖️ Beach Access',
  trailhead: '🥾 Trailhead',
  waterfall: '💧 Waterfall',
  market: '🛒 Market',
  restaurant: '🍽️ Restaurant',
  hotel: '🏨 Hotel',
  wildlife_spot: '🦜 Wildlife Spot',
  cultural_site: '🏛️ Cultural Site',
  activity_spot: '🎒 Activity Spot',
};

const SOURCE_LABELS: Record<string, string> = {
  unsplash: 'Photo',
  instagram: 'Instagram',
  creator: 'Creator',
};

function SmallMap({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  // Use OpenStreetMap embed — free, no API key required
  const delta = 0.08;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  const mapsUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=13/${lat}/${lng}`;

  return (
    <div className="relative rounded-xl overflow-hidden" style={{ height: '180px' }}>
      <iframe
        src={src}
        title={`Map: ${label}`}
        className="w-full h-full border-0"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin"
      />
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full text-white transition-colors hover:opacity-90"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      >
        <ExternalLink className="w-3 h-3" />
        Open map
      </a>
    </div>
  );
}

export function PhotoModal({ item, onClose, onAddToTrip }: PhotoModalProps) {
  const [instaPosts, setInstaPosts] = useState<NearbyPost[]>([]);
  const [loadingInsta, setLoadingInsta] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Fetch Instagram posts from this location
  useEffect(() => {
    setLoadingInsta(true);
    fetch(`/api/discover/nearby-instagram?region=${item.region}&lat=${item.lat}&lng=${item.lng}&exclude=${item.id}&limit=9`)
      .then((r) => r.json())
      .then((json) => {
        setInstaPosts(json.posts ?? []);
        setLoadingInsta(false);
      })
      .catch(() => setLoadingInsta(false));
  }, [item.region, item.lat, item.lng, item.id]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const tripQuery = `Plan a trip to ${item.region_name}`;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Photo details: ${item.caption}`}
    >
      <div
        className="bg-background rounded-2xl overflow-hidden shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row"
        style={{ animation: 'modalIn 0.2s ease-out' }}
      >
        {/* Left: photo */}
        <div className="relative md:w-[48%] flex-shrink-0 bg-gray-900" style={{ minHeight: '300px' }}>
          {/* Instagram embed placeholder — when source_type is 'instagram', we'd render the embed here */}
          {item.source_type === 'instagram' && item.instagram_embed_url ? (
            <iframe
              src={item.instagram_embed_url}
              className="w-full h-full border-0"
              title={item.caption}
              allowFullScreen
            />
          ) : (
            <img
              src={item.url}
              alt={item.caption}
              className="w-full h-full object-cover outline outline-1 -outline-offset-1 outline-black/10"
              style={{ maxHeight: '80vh' }}
            />
          )}

          {/* Source badge */}
          <div className="absolute top-4 left-4">
            <span className="text-xs font-medium px-2.5 py-1 rounded-full text-white"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}>
              {CATEGORY_ICONS[item.category]} {SOURCE_LABELS[item.source_type] ?? 'Photo'}
            </span>
          </div>

          {/* Creator handle */}
          {item.creator_handle && (
            <div className="absolute bottom-4 left-4">
              <span className="text-xs font-medium text-white/90"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                @{item.creator_handle}
              </span>
            </div>
          )}

          {/* Close button (mobile) */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 md:hidden w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-[background-color] duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Close photo details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Right: content */}
        <div className="flex flex-col overflow-y-auto flex-1 p-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="text-lg font-bold text-foreground leading-tight text-balance">{item.caption}</h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>{item.region_name}</span>
                </div>
                {item.location_category && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {LOCATION_CATEGORY_LABELS[item.location_category] ?? item.location_category}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="hidden md:flex w-10 h-10 items-center justify-center rounded-full hover:bg-muted transition-[background-color,color] duration-150 text-muted-foreground hover:text-foreground flex-shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Close photo details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-3 text-pretty">{item.description}</p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {item.tags.map((tag) => (
              <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                {tag}
              </span>
            ))}
          </div>

          {/* Geo location map */}
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Where it was taken</span>
            </div>
            <SmallMap lat={item.lat} lng={item.lng} label={item.geo_label} />
            <p className="text-xs text-muted-foreground mt-1.5 tabular-nums">{item.geo_label} — {item.lat.toFixed(4)}°N, {Math.abs(item.lng).toFixed(4)}°W</p>
          </div>

          {/* CTA buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => onAddToTrip(item)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground transition-[opacity,transform] duration-150 ease-out hover:opacity-90 active:scale-[0.96] cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <Plus className="w-4 h-4" />
              Add to Itinerary
            </button>
            <a
              href={`/?q=${encodeURIComponent(tripQuery)}`}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted transition-[background-color] duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Plan trip
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Divider */}
          <div className="border-t border-border mb-4" />

          {/* Photos from this location + Instagram link */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <InstagramIcon className="w-4 h-4 text-pink-500" />
              <h3 className="text-sm font-semibold text-foreground text-balance">Photos from {item.region_name}</h3>
            </div>
            {loadingInsta ? (
              <div className="grid grid-cols-3 gap-1.5">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : instaPosts.length === 0 ? (
              <div className="text-center py-6 bg-muted/50 rounded-xl">
                <InstagramIcon className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">No photos from this spot yet</p>
                <a
                  href={`https://www.instagram.com/explore/tags/${encodeURIComponent(item.region_name.toLowerCase().replace(/\s+/g, ''))}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-pink-600 hover:text-pink-700 font-medium transition-[color] duration-150"
                >
                  Search on Instagram
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-1.5">
                  {instaPosts.map((post) => {
                    const isInstagram = post.source_type === 'instagram' && post.instagram_post_url;
                    const Wrapper = isInstagram ? 'a' : 'div';
                    const linkProps = isInstagram
                      ? { href: post.instagram_post_url!, target: '_blank' as const, rel: 'noopener noreferrer' }
                      : {};
                    return (
                      <Wrapper
                        key={post.id}
                        {...linkProps}
                        className="group relative aspect-square rounded-lg overflow-hidden bg-muted"
                      >
                        <img
                          src={post.url}
                          alt={post.caption}
                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105 outline outline-1 -outline-offset-1 outline-black/10"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-1.5 opacity-0 group-hover:opacity-100">
                          <span className="text-[10px] text-white font-medium truncate">
                            {post.creator_handle ? `@${post.creator_handle}` : post.geo_label}
                          </span>
                        </div>
                        {isInstagram && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' }}>
                            <InstagramIcon className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </Wrapper>
                    );
                  })}
                </div>
                <a
                  href={`https://www.instagram.com/explore/tags/${encodeURIComponent(item.region_name.toLowerCase().replace(/\s+/g, ''))}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-1.5 text-sm text-pink-600 hover:text-pink-700 font-medium transition-[color] duration-150"
                >
                  See more on Instagram
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
