'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Sparkles, RefreshCw, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ItineraryFeedCard } from '@/components/social/ItineraryFeedCard';
import { InfluencerCard } from './InfluencerCard';
import { ItineraryDetail } from './ItineraryDetail';
import { FilterBar, type Filters } from './FilterBar';
import { ItineraryWizard } from '@/components/itinerary/ItineraryWizard';
import type { Itinerary } from '@/types/database';

interface CreatorWithItinerary {
  creator: {
    id: string;
    user_id: string;
    username: string;
    bio: string;
    avatar_url: string | null;
    instagram_handle: string | null;
    followers: number;
    is_verified: boolean;
  };
  itinerary: Itinerary;
}

interface ItinerariesClientProps {
  initialItineraries: Itinerary[];
  initialCount: number;
  influencerPicks: CreatorWithItinerary[];
  regions: string[];
}

const DEFAULT_FILTERS: Filters = {
  region: null,
  durationMin: null,
  durationMax: null,
  budgetMin: null,
  budgetMax: null,
  sort: 'popular',
};

export function ItinerariesClient({
  initialItineraries,
  initialCount,
  influencerPicks,
  regions,
}: ItinerariesClientProps) {
  const [itineraries, setItineraries] = useState<Itinerary[]>(initialItineraries);
  const [totalCount, setTotalCount] = useState(initialCount);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  const hasActiveFilters = filters.region || filters.durationMin || filters.budgetMin || filters.sort !== 'popular';

  const fetchItineraries = useCallback(async (f: Filters) => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (f.region) params.set('region', f.region);
      if (f.durationMin) params.set('duration_min', String(f.durationMin));
      if (f.durationMax) params.set('duration_max', String(f.durationMax));
      if (f.budgetMin) params.set('budget_min', String(f.budgetMin));
      if (f.budgetMax) params.set('budget_max', String(f.budgetMax));
      params.set('sort', f.sort);
      params.set('limit', '20');

      const res = await fetch(`/api/itineraries?${params}`);
      if (!res.ok) {
        // If service unavailable (no Supabase), fall back to client-side filtering
        if (res.status === 503) {
          let filtered = [...initialItineraries];
          if (f.region) filtered = filtered.filter(i => i.regions?.includes(f.region!));
          if (f.durationMin) filtered = filtered.filter(i => i.total_days >= f.durationMin!);
          if (f.durationMax) filtered = filtered.filter(i => i.total_days <= f.durationMax!);
          if (f.budgetMin) filtered = filtered.filter(i => i.estimated_cost_usd >= f.budgetMin!);
          if (f.budgetMax) filtered = filtered.filter(i => i.estimated_cost_usd <= f.budgetMax!);
          if (f.sort === 'newest') filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));
          else if (f.sort === 'price') filtered.sort((a, b) => a.estimated_cost_usd - b.estimated_cost_usd);
          else filtered.sort((a, b) => (b.saves + b.likes) - (a.saves + a.likes));
          setItineraries(filtered);
          setTotalCount(filtered.length);
          return;
        }
        throw new Error();
      }
      const { data, count } = await res.json();
      setItineraries(data || []);
      setTotalCount(count || 0);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [initialItineraries]);

  useEffect(() => {
    if (hasActiveFilters) {
      fetchItineraries(filters);
    } else {
      setItineraries(initialItineraries);
      setTotalCount(initialCount);
    }
  }, [filters, hasActiveFilters, fetchItineraries, initialItineraries, initialCount]);

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-white rounded-2xl p-8 md:p-12 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Discover Venezuela Itineraries</h1>
        <p className="text-white/85 text-base md:text-lg max-w-xl mx-auto mb-5">
          Curated trip plans from travelers and creators who know Venezuela best
        </p>
        <Button
          onClick={() => setShowWizard(true)}
          variant="secondary"
          size="lg"
          className="font-semibold"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create My Itinerary
        </Button>
      </div>

      {showWizard && <ItineraryWizard onClose={() => setShowWizard(false)} />}

      {/* Filters */}
      <FilterBar regions={regions} filters={filters} onChange={setFilters} />

      {/* Sort tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-xl p-1 w-fit" role="tablist" aria-label="Sort itineraries">
        {(['popular', 'newest', 'price'] as const).map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={filters.sort === s}
            onClick={() => setFilters((f) => ({ ...f, sort: s }))}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
              filters.sort === s
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {s === 'popular' ? 'Popular' : s === 'newest' ? 'Newest' : 'Price'}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-3">Something went wrong loading itineraries.</p>
          <Button variant="outline" onClick={() => fetchItineraries(filters)}>
            <RefreshCw className="w-4 h-4 mr-2" /> Try Again
          </Button>
        </div>
      )}

      {/* Popular Itineraries Grid */}
      {!error && (
        <>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {hasActiveFilters ? `Results (${totalCount})` : 'Popular Itineraries'}
              </h2>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-2xl border overflow-hidden">
                    <div className="aspect-video bg-muted animate-pulse" />
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-muted animate-pulse" />
                        <div className="h-3.5 w-24 bg-muted rounded animate-pulse" />
                      </div>
                      <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                      <div className="h-3 w-full bg-muted rounded animate-pulse" />
                      <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
                      <div className="flex justify-between items-center pt-2">
                        <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                        <div className="flex gap-2">
                          <div className="h-8 w-20 bg-muted rounded-lg animate-pulse" />
                          <div className="h-8 w-28 bg-muted rounded-lg animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : itineraries.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {itineraries.map((it) => (
                  <div key={it.id} onClick={() => setSelectedItinerary(it)} className="cursor-pointer">
                    <ItineraryFeedCard itinerary={it} showActions />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-muted/30 rounded-2xl">
                <Search className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No itineraries match these filters</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">Try adjusting your filters or browse all itineraries</p>
                <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Influencer Picks */}
      {influencerPicks.length > 0 && !hasActiveFilters && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Influencer Itineraries</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {influencerPicks.map(({ creator, itinerary }) => (
              <InfluencerCard key={creator.id} creator={creator} itinerary={itinerary} />
            ))}
          </div>
        </div>
      )}

      {/* AI CTA */}
      <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-8 text-center text-white">
        <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-80" />
        <h2 className="text-xl font-bold mb-2">Can't find the perfect itinerary?</h2>
        <p className="text-white/80 text-sm mb-4 max-w-md mx-auto">
          Tell our AI what kind of trip you want and we'll build one for you in seconds
        </p>
        <Button variant="secondary" size="lg" asChild>
          <Link href="/map">Build My Itinerary with AI</Link>
        </Button>
      </div>

      {/* Itinerary Detail Modal */}
      {selectedItinerary && (
        <ItineraryDetail
          itinerary={selectedItinerary}
          onClose={() => setSelectedItinerary(null)}
        />
      )}
    </div>
  );
}
