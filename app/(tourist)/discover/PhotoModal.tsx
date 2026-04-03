'use client';

import { useEffect, useRef, useState } from 'react';
import { X, MapPin, Plus, ChevronRight, ExternalLink } from 'lucide-react';
import type { DiscoverItem } from './types';

interface NearbyListing {
  id: string;
  title: string;
  slug?: string;
  type: string;
  rating: number | null;
  cover_image_url: string | null;
  region: string;
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
  const [nearby, setNearby] = useState<NearbyListing[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Fetch nearby stays
  useEffect(() => {
    setLoadingNearby(true);
    fetch(`/api/listings?region=${item.region}&limit=3`)
      .then((r) => r.json())
      .then((json) => {
        setNearby(json.data ?? []);
        setLoadingNearby(false);
      })
      .catch(() => setLoadingNearby(false));
  }, [item.region]);

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row"
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
              className="w-full h-full object-cover"
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
            className="absolute top-4 right-4 md:hidden w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Right: content */}
        <div className="flex flex-col overflow-y-auto flex-1 p-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">{item.caption}</h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  <span>{item.region_name}</span>
                </div>
                {item.location_category && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {LOCATION_CATEGORY_LABELS[item.location_category] ?? item.location_category}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="hidden md:flex w-8 h-8 items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 leading-relaxed mb-3">{item.description}</p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {item.tags.map((tag) => (
              <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                {tag}
              </span>
            ))}
          </div>

          {/* Geo location map */}
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <MapPin className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Where it was taken</span>
            </div>
            <SmallMap lat={item.lat} lng={item.lng} label={item.geo_label} />
            <p className="text-xs text-gray-400 mt-1.5">{item.geo_label} — {item.lat.toFixed(4)}°N, {Math.abs(item.lng).toFixed(4)}°W</p>
          </div>

          {/* CTA buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => onAddToTrip(item)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}
            >
              <Plus className="w-4 h-4" />
              Add to Itinerary
            </button>
            <a
              href={`/?q=${encodeURIComponent(tripQuery)}`}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Plan trip
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 mb-4" />

          {/* Nearby stays */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2.5">Nearby Stays</h3>
            {loadingNearby ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : nearby.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No stays found nearby.</p>
            ) : (
              <div className="space-y-1.5">
                {nearby.map((stay) => (
                  <a
                    key={stay.id}
                    href={`/listing/${stay.slug || stay.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                      {stay.cover_image_url ? (
                        <img src={stay.cover_image_url} alt={stay.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-lg">
                          🏡
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {stay.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500 capitalize">{stay.type}</span>
                        {stay.rating !== null && (
                          <>
                            <span className="text-gray-300 text-xs">·</span>
                            <span className="text-xs text-amber-600 font-medium">★ {stay.rating.toFixed(1)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                  </a>
                ))}
              </div>
            )}

            <a
              href={`/explore?region=${item.region}`}
              className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              See all stays in {item.region_name}
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
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
