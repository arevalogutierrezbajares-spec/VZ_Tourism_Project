'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { SlidersHorizontal, MapPin, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/common/SearchBar';
import { SuggestionChips } from '@/components/search/SuggestionChips';
import { AIResponsePanel } from '@/components/search/AIResponsePanel';
import { FilterOverlay } from '@/components/search/FilterOverlay';
import { ItineraryPanel } from '@/components/itinerary/ItineraryPanel';
import { useSearch } from '@/hooks/use-search';
import { useItinerary } from '@/hooks/use-itinerary';
import { useAuth } from '@/hooks/use-auth';

const MapContainer = dynamic(
  () => import('@/components/map/MapContainer').then((m) => ({ default: m.MapContainer })),
  { ssr: false }
);

export default function HomePage() {
  const { search, isStreaming, suggestions, isFilterOpen, toggleFilterPanel, hasSearched } =
    useSearch();
  const { isOpen: itineraryOpen, createNew } = useItinerary();
  const { isAuthenticated } = useAuth();

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        <MapContainer className="w-full h-full" />
      </div>

      {/* Floating UI overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top search bar */}
        <div className="pointer-events-auto absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-20">
          <div className="space-y-2">
            <div className="flex gap-2">
              <SearchBar
                onSearch={search}
                isLoading={isStreaming}
                className="flex-1"
              />
              <Button
                variant="secondary"
                size="icon"
                className="h-12 w-12 rounded-2xl bg-white dark:bg-gray-900 shadow-lg border border-gray-200"
                onClick={toggleFilterPanel}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </div>

            {/* Suggestion chips */}
            {!hasSearched && (
              <SuggestionChips
                suggestions={suggestions.slice(0, 5)}
                onSelect={search}
                className="justify-center"
              />
            )}
          </div>
        </div>

        {/* AI Response Panel - left side */}
        {hasSearched && (
          <div className="pointer-events-auto absolute top-24 left-4 w-80 z-20 max-h-[calc(100vh-140px)]">
            <AIResponsePanel onSearch={search} />
          </div>
        )}

        {/* Bottom controls */}
        <div className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-20">
          {isAuthenticated && (
            <Button
              variant="secondary"
              size="sm"
              className="bg-white dark:bg-gray-900 shadow-lg border border-gray-200 rounded-2xl gap-2"
              onClick={() => createNew()}
            >
              <Route className="w-4 h-4" />
              Plan itinerary
            </Button>
          )}
          <a
            href="/library"
            className="inline-flex items-center gap-2 bg-white dark:bg-gray-900 shadow-lg border border-gray-200 rounded-2xl px-2.5 py-1.5 text-sm font-medium hover:bg-gray-50"
          >
            <MapPin className="w-4 h-4" />
            Browse all
          </a>
        </div>
      </div>

      {/* Itinerary side panel */}
      {itineraryOpen && <ItineraryPanel />}

      {/* Filter overlay */}
      {isFilterOpen && <FilterOverlay onClose={toggleFilterPanel} />}
    </div>
  );
}
