'use client';

import dynamic from 'next/dynamic';
import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { SlidersHorizontal, MapPin, Route, LogIn, User, Luggage, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SearchBar } from '@/components/common/SearchBar';
import { SuggestionChips } from '@/components/search/SuggestionChips';
import { AIResponsePanel } from '@/components/search/AIResponsePanel';
import { FilterOverlay } from '@/components/search/FilterOverlay';
import { ItineraryPanel } from '@/components/itinerary/ItineraryPanel';
import { useSearch } from '@/hooks/use-search';
import { useItinerary } from '@/hooks/use-itinerary';
import { useAuth } from '@/hooks/use-auth';
import { useMapStore } from '@/stores/map-store';
import { BUSINESS_CATEGORIES } from '@/lib/mapbox/helpers';
import { getInitials } from '@/lib/utils';
import type { MapPin as MapPinType } from '@/types/map';

const MapContainer = dynamic(
  () => import('@/components/map/MapContainer').then((m) => ({ default: m.MapContainer })),
  { ssr: false }
);

const CATEGORY_FILTER_ALL = 'all';

export default function HomePage() {
  return (
    <Suspense>
      <MapPageContent />
    </Suspense>
  );
}

function MapPageContent() {
  const { search, isStreaming, suggestions, isFilterOpen, toggleFilterPanel, hasSearched } =
    useSearch();
  const { isOpen: itineraryOpen, createNew } = useItinerary();
  const { isAuthenticated, user, profile, signOut } = useAuth();
  const router = useRouter();
  const { setPins, hiddenCategories, toggleCategory } = useMapStore();
  const [activeCategory, setActiveCategory] = useState(CATEGORY_FILTER_ALL);
  const [totalCount, setTotalCount] = useState(0);
  const searchParams = useSearchParams();

  // Handle deep-link intents from the "Build my itinerary" modal
  useEffect(() => {
    const mode = searchParams.get('mode');

    if (mode === 'ai') {
      // Auto-trigger AI search with a trip-planning prompt
      const t = setTimeout(() => {
        search('Help me plan a trip to Venezuela');
        router.replace('/map');
      }, 600);
      return () => clearTimeout(t);
    }

    const plan = searchParams.get('plan');
    if (plan) {
      const t = setTimeout(() => {
        search(decodeURIComponent(plan).slice(0, 800));
        router.replace('/map');
      }, 600);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load all scraped listings as map pins on mount
  useEffect(() => {
    async function loadPins() {
      try {
        const res = await fetch('/api/listings?limit=2000');
        if (!res.ok) return;
        const json = await res.json();
        const listings: {
          id: string;
          title: string;
          latitude: number;
          longitude: number;
          category: string;
          rating: number | null;
          review_count: number;
          city: string;
          region: string;
        }[] = json.data ?? [];

        const pins: MapPinType[] = listings.map((l) => ({
          id: l.id,
          lat: l.latitude,
          lng: l.longitude,
          title: l.title,
          category: l.category,
          rating: l.rating ?? undefined,
          reviewCount: l.review_count,
          city: l.city,
          region: l.region,
          listingId: l.id,
        }));

        setPins(pins);
        setTotalCount(pins.length);
      } catch (err) {
        console.error('Failed to load map pins', err);
      }
    }

    loadPins();
  }, [setPins]);

  const handleCategoryFilter = (cat: string) => {
    setActiveCategory(cat);
    if (cat === CATEGORY_FILTER_ALL) {
      // Show all — remove all hidden categories
      BUSINESS_CATEGORIES.forEach(({ key }) => {
        if (hiddenCategories.has(key)) toggleCategory(key);
      });
    } else {
      // Hide all except selected
      BUSINESS_CATEGORIES.forEach(({ key }) => {
        const shouldBeHidden = key !== cat;
        const isHidden = hiddenCategories.has(key);
        if (shouldBeHidden !== isHidden) toggleCategory(key);
      });
    }
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        <MapContainer className="w-full h-full" />
      </div>

      {/* Floating UI overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top-right auth button */}
        <div className="pointer-events-auto absolute top-4 right-4 z-20">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary shadow-lg">
                <Avatar className="w-10 h-10 border-2 border-white shadow-md">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {getInitials(profile?.full_name || user?.full_name || 'U')}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{profile?.full_name || user?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email || user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.location.href = '/account'}>
                  <User className="mr-2 h-4 w-4" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = '/trips'}>
                  <Luggage className="mr-2 h-4 w-4" />
                  My Trips
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = '/trips#saved'}>
                  <Heart className="mr-2 h-4 w-4" />
                  Saved Places
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 bg-background shadow-lg border rounded-2xl px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Sign in
            </Link>
          )}
        </div>

        {/* Top search bar + filter chips */}
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
                className="h-12 w-12 rounded-2xl bg-background shadow-lg border focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                onClick={toggleFilterPanel}
                aria-label="Open filters"
                aria-expanded={isFilterOpen}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </div>

            {/* Category filter chips */}
            {totalCount > 0 && !hasSearched && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" role="radiogroup" aria-label="Filter by category">
                <button
                  onClick={() => handleCategoryFilter(CATEGORY_FILTER_ALL)}
                  role="radio"
                  aria-checked={activeCategory === CATEGORY_FILTER_ALL}
                  className={`flex-shrink-0 px-3 py-1.5 min-h-[36px] rounded-full text-xs font-medium shadow-sm border transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    activeCategory === CATEGORY_FILTER_ALL
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background text-muted-foreground border hover:bg-muted/50'
                  }`}
                >
                  All ({totalCount.toLocaleString()})
                </button>
                {BUSINESS_CATEGORIES.map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => handleCategoryFilter(key)}
                    role="radio"
                    aria-checked={activeCategory === key}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-full text-xs font-medium shadow-sm border transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                      activeCategory === key
                        ? 'text-white border-transparent'
                        : 'bg-background text-muted-foreground border hover:bg-muted/50'
                    }`}
                    style={
                      activeCategory === key ? { backgroundColor: color, borderColor: color } : {}
                    }
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: activeCategory === key ? 'white' : color }}
                      aria-hidden="true"
                    />
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Suggestion chips */}
            {!hasSearched && totalCount === 0 && (
              <SuggestionChips
                suggestions={suggestions.slice(0, 5)}
                onSelect={search}
                className="justify-center"
              />
            )}
          </div>
        </div>

        {/* Personalized greeting (authenticated, no active search) */}
        {isAuthenticated && !hasSearched && (
          <div className="pointer-events-none absolute top-24 left-4 z-20">
            <div className="inline-flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-2xl px-3 py-1.5 shadow-sm border text-sm text-foreground">
              <span>👋</span>
              <span>Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}!</span>
            </div>
          </div>
        )}

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
              className="bg-background shadow-lg border rounded-2xl gap-2"
              onClick={() => createNew()}
            >
              <Route className="w-4 h-4" />
              Build my itinerary
            </Button>
          )}
          <a
            href="/explore"
            className="inline-flex items-center gap-2 bg-background shadow-lg border rounded-2xl px-2.5 py-1.5 text-sm font-medium hover:bg-muted/50 transition-colors"
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
