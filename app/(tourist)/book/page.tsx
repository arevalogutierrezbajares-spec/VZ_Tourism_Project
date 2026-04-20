'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, Calendar, Users, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrowseListingCard } from '@/components/listing/BrowseListingCard';

const DESTINATIONS = [
  { id: 'losroques', label: 'Los Roques', emoji: '🏝️' },
  { id: 'merida', label: 'Mérida', emoji: '⛰️' },
  { id: 'margarita', label: 'Margarita Island', emoji: '🌊' },
  { id: 'canaima', label: 'Canaima', emoji: '💧' },
  { id: 'choroni', label: 'Choroní', emoji: '🌴' },
  { id: 'caracas', label: 'Caracas', emoji: '🏙️' },
  { id: 'morrocoy', label: 'Morrocoy', emoji: '🤿' },
  { id: 'falcon', label: 'Falcón', emoji: '🏖️' },
];

const TYPES = [
  { id: 'all', label: 'Everything' },
  { id: 'hotel', label: 'Stays' },
  { id: 'restaurant', label: 'Dining' },
  { id: 'experience', label: 'Experiences' },
];

const PAGE_SIZE = 24;

import type { BrowseApiListing } from '@/components/listing/BrowseListingCard';

export default function BookPage() {
  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [type, setType] = useState('all');
  const [listings, setListings] = useState<BrowseApiListing[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: '0' });
    if (destination) params.set('region', destination);
    if (type !== 'all') params.set('category', type);
    return `/api/listings?${params}`;
  }, [destination, type]);

  const runSearch = useCallback(async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(buildUrl());
      const json = await res.json();
      setListings(json.data ?? []);
      setCount(json.count ?? 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  // Auto-search when filters change
  useEffect(() => {
    const t = setTimeout(runSearch, 300);
    return () => clearTimeout(t);
  }, [runSearch]);

  return (
    <div className="min-h-screen bg-muted">
      {/* Search bar */}
      <div className="bg-white border-b shadow-sm">
        <div className="container px-4 py-5">
          <h1 className="text-2xl font-bold mb-4">Where to in Venezuela?</h1>

          <div className="flex flex-col sm:flex-row gap-2 bg-white rounded-2xl border shadow-lg p-1.5">
            {/* Destination */}
            <div className="relative flex-1 min-w-0">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <MapPin className="w-4 h-4 text-muted-foreground" />
              </div>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full pl-9 pr-8 py-3 text-sm bg-transparent appearance-none focus:outline-none cursor-pointer font-medium"
              >
                <option value="">Anywhere</option>
                {DESTINATIONS.map((d) => (
                  <option key={d.id} value={d.id}>{d.emoji} {d.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>

            <div className="hidden sm:block w-px bg-border self-stretch my-1" />

            {/* Check-in */}
            <div className="relative flex-1 min-w-0">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </div>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full pl-9 pr-3 py-3 text-sm bg-transparent focus:outline-none"
                placeholder="Check-in"
              />
            </div>

            <div className="hidden sm:block w-px bg-border self-stretch my-1" />

            {/* Check-out */}
            <div className="relative flex-1 min-w-0">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </div>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full pl-9 pr-3 py-3 text-sm bg-transparent focus:outline-none"
                placeholder="Check-out"
              />
            </div>

            <div className="hidden sm:block w-px bg-border self-stretch my-1" />

            {/* Guests */}
            <div className="relative flex items-center gap-2 px-3 py-2 min-w-[120px]">
              <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setGuests(Math.max(1, guests - 1))}
                  className="w-6 h-6 rounded-full border flex items-center justify-center text-sm hover:bg-muted transition-colors"
                >−</button>
                <span className="text-sm font-medium w-4 text-center">{guests}</span>
                <button
                  type="button"
                  onClick={() => setGuests(guests + 1)}
                  className="w-6 h-6 rounded-full border flex items-center justify-center text-sm hover:bg-muted transition-colors"
                >+</button>
              </div>
            </div>

            {/* Search button */}
            <button
              onClick={runSearch}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:block">Search</span>
            </button>
          </div>

          {/* Type pills */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
            {TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={cn(
                  'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0',
                  type === t.id
                    ? 'bg-foreground text-background'
                    : 'bg-white border hover:border-foreground/40'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="container px-4 py-8">
        {/* Active filters */}
        {(destination || type !== 'all') && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <span className="text-sm text-muted-foreground">Filters:</span>
            {destination && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border rounded-full text-sm">
                {DESTINATIONS.find(d => d.id === destination)?.emoji} {DESTINATIONS.find(d => d.id === destination)?.label}
                <button onClick={() => setDestination('')} className="ml-1 hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {type !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border rounded-full text-sm">
                {TYPES.find(t => t.id === type)?.label}
                <button onClick={() => setType('all')} className="ml-1 hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white border animate-pulse" style={{ height: '280px' }} />
            ))}
          </div>
        ) : hasSearched && listings.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="font-semibold text-lg">No results found</h3>
            <p className="text-muted-foreground mt-1">Try a different destination or type.</p>
          </div>
        ) : (
          <>
            {hasSearched && (
              <p aria-live="polite" className="text-sm text-muted-foreground mb-5">
                {count.toLocaleString()} places{destination ? ` in ${DESTINATIONS.find(d => d.id === destination)?.label}` : ' across Venezuela'}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {listings.map((listing) => (
                <BrowseListingCard key={listing.id} listing={listing} variant="compact" />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
