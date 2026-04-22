'use client';

import dynamic from 'next/dynamic';
import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { SlidersHorizontal, MapPin, Route, LogIn, User, Luggage, Heart, X } from 'lucide-react';
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
import { CitySearch } from '@/components/map/CitySearch';
import { CitySidebar } from '@/components/map/CitySidebar';
import { ListingModal } from '@/components/map/ListingModal';
import { useSearch } from '@/hooks/use-search';
import { useItinerary } from '@/hooks/use-itinerary';
import { useAuth } from '@/hooks/use-auth';
import { useMapStore } from '@/stores/map-store';
import { useSearchStore } from '@/stores/search-store';
import { BUSINESS_CATEGORIES, normalizeCategory } from '@/lib/mapbox/helpers';
import { VENEZUELA_CENTER, VENEZUELA_DEFAULT_ZOOM } from '@/lib/constants';
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
  const { setPins, setCenter, setZoom, selectedPin, setSelectedPin, setHiddenCategories, setTargetBounds } = useMapStore();
  const searchFilters = useSearchStore((s) => s.filters);
  const [activeCategory, setActiveCategory] = useState(CATEGORY_FILTER_ALL);
  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [allPins, setAllPins] = useState<MapPinType[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [pinLoadError, setPinLoadError] = useState(false);
  const [pinsLoading, setPinsLoading] = useState(true);
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
    const controller = new AbortController();

    async function loadPins() {
      setPinsLoading(true);
      setPinLoadError(false);
      try {
        const res = await fetch('/api/listings?limit=2000', {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`API responded ${res.status}`);
        const json = await res.json();
        const listings: {
          id: string;
          title: string;
          slug: string;
          latitude: number;
          longitude: number;
          category: string;
          rating: number | null;
          review_count: number;
          city: string;
          region: string;
        }[] = json.data ?? [];

        const pins: MapPinType[] = listings
          .filter((l) => Number.isFinite(l.latitude) && Number.isFinite(l.longitude))
          .map((l) => ({
            id: l.id,
            lat: l.latitude,
            lng: l.longitude,
            title: l.title,
            slug: l.slug,
            category: l.category,
            rating: l.rating ?? undefined,
            reviewCount: l.review_count,
            city: l.city,
            region: l.region,
            listingId: l.id,
          }));

        // Compute per-category counts using normalized keys
        const counts: Record<string, number> = {};
        for (const p of pins) {
          const key = normalizeCategory(p.category);
          counts[key] = (counts[key] || 0) + 1;
        }

        setAllPins(pins);
        setPins(pins);
        setTotalCount(pins.length);
        setFilteredCount(pins.length);
        setCategoryCounts(counts);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        console.error('Failed to load map pins', err);
        setPinLoadError(true);
      } finally {
        setPinsLoading(false);
      }
    }

    loadPins();
    return () => controller.abort();
  }, [setPins]);

  // Sync FilterOverlay filters (searchStore) → map pins
  useEffect(() => {
    if (allPins.length === 0) return;

    const hasAnyFilter =
      searchFilters.category ||
      searchFilters.region ||
      (searchFilters.minPrice != null && searchFilters.minPrice > 0) ||
      (searchFilters.maxPrice != null && searchFilters.maxPrice < 1000);

    // No filters active → restore full pin set and show all categories
    if (!hasAnyFilter) {
      setPins(allPins);
      setHiddenCategories(new Set());
      setActiveCategory(CATEGORY_FILTER_ALL);
      setFilteredCount(allPins.length);
      return;
    }

    // Category filter from overlay → hide non-matching categories (atomic)
    if (searchFilters.category) {
      const hidden = new Set(
        BUSINESS_CATEGORIES.map((c) => c.key).filter((k) => k !== searchFilters.category)
      );
      setHiddenCategories(hidden);
      setActiveCategory(searchFilters.category);
    }

    // Region + price filters → filter the pins array directly
    let filtered = allPins;
    if (searchFilters.region) {
      const r = searchFilters.region.toLowerCase();
      filtered = filtered.filter(
        (p) => (p.region ?? '').toLowerCase() === r || (p.city ?? '').toLowerCase() === r
      );
    }
    if (searchFilters.minPrice != null && searchFilters.minPrice > 0) {
      filtered = filtered.filter((p) => (p.price ?? 0) >= searchFilters.minPrice!);
    }
    if (searchFilters.maxPrice != null && searchFilters.maxPrice < 1000) {
      filtered = filtered.filter((p) => (p.price ?? 0) <= searchFilters.maxPrice!);
    }

    setPins(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchFilters]);

  const handleCategoryFilter = (cat: string) => {
    setActiveCategory(cat);
    if (cat === CATEGORY_FILTER_ALL) {
      setHiddenCategories(new Set());
      setFilteredCount(totalCount);
      setCenter(VENEZUELA_CENTER);
      setZoom(VENEZUELA_DEFAULT_ZOOM);
    } else {
      const hidden = new Set(
        BUSINESS_CATEGORIES.map((c) => c.key).filter((k) => k !== cat)
      );
      setHiddenCategories(hidden);
      setFilteredCount(categoryCounts[cat] || 0);

      // Zoom to fit filtered pins so the change is visually obvious
      const visible = allPins.filter((p) => normalizeCategory(p.category) === cat);
      if (visible.length > 0) {
        const lats = visible.map((p) => p.lat);
        const lngs = visible.map((p) => p.lng);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        // Add padding so pins aren't right at the edge
        const pad = 0.3;
        setTargetBounds([
          [minLng - pad, minLat - pad],
          [maxLng + pad, maxLat + pad],
        ]);
      }
    }
  };

  const handleCitySelect = (city: { name: string; lat: number; lng: number; isRegion?: boolean }) => {
    setCityFilter(city.name);
    // Filter pins to match — exact match for city, includes for region (covers sub-areas)
    const q = city.name.toLowerCase();
    const filtered = allPins.filter((p) => {
      const pinCity = (p.city ?? '').toLowerCase();
      const pinRegion = (p.region ?? '').toLowerCase();
      return pinCity === q || pinRegion === q || pinRegion.includes(q);
    });
    const pinsToShow = filtered.length > 0 ? filtered : allPins;
    setPins(pinsToShow);

    // Fly to the city center — use the median of filtered pin coordinates
    // for a more accurate center than the sidebar's single lat/lng
    if (pinsToShow.length > 1 && pinsToShow !== allPins) {
      const sortedLats = pinsToShow.map((p) => p.lat).sort((a, b) => a - b);
      const sortedLngs = pinsToShow.map((p) => p.lng).sort((a, b) => a - b);
      const mid = Math.floor(sortedLats.length / 2);
      setCenter([sortedLngs[mid], sortedLats[mid]]);
      setZoom(city.isRegion ? 9 : 12);
    } else {
      setCenter([city.lng, city.lat]);
      setZoom(city.isRegion ? 9 : 12);
    }
  };

  const handleCityClear = () => {
    setCityFilter(null);
    setPins(allPins);
    setTargetBounds(null);
    setCenter(VENEZUELA_CENTER);
    setZoom(VENEZUELA_DEFAULT_ZOOM);
    setActiveCategory(CATEGORY_FILTER_ALL);
    setHiddenCategories(new Set());
    setFilteredCount(allPins.length);
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
        <div className="pointer-events-auto absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-20">
          <div className="space-y-2">
            {/* Airbnb-style search row: City picker | AI search | Filters */}
            <div className="flex gap-2 items-center">
              <CitySearch
                pins={allPins}
                onSelectCity={handleCitySelect}
                onClear={handleCityClear}
              />
              <SearchBar
                onSearch={search}
                isLoading={isStreaming}
                className="flex-1"
              />
              <Button
                variant="secondary"
                size="icon"
                className="h-12 w-12 rounded-2xl bg-background shadow-lg border flex-shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                onClick={toggleFilterPanel}
                aria-label="Open filters"
                aria-expanded={isFilterOpen}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </div>

            {/* Active city filter badge */}
            {cityFilter && !hasSearched && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full pl-3 pr-2 py-1 text-xs font-medium">
                  <MapPin className="w-3 h-3" />
                  {cityFilter}
                  <button
                    type="button"
                    onClick={handleCityClear}
                    className="p-0.5 rounded-full hover:bg-primary/20 transition-colors"
                    aria-label={`Remove ${cityFilter} filter`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              </div>
            )}

            {/* Category filter chips */}
            {totalCount > 0 && !hasSearched && (
              <div className="space-y-1.5">
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
                  {BUSINESS_CATEGORIES.map(({ key, label, color }) => {
                    const count = categoryCounts[key] || 0;
                    return (
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
                        {count > 0 && (
                          <span className={`tabular-nums ${activeCategory === key ? 'text-white/80' : 'text-muted-foreground/60'}`}>
                            ({count})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {/* Active filter indicator */}
                {activeCategory !== CATEGORY_FILTER_ALL && (
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[11px] font-medium text-muted-foreground bg-background/90 backdrop-blur-sm rounded-md px-2 py-0.5 shadow-sm border">
                      Showing {filteredCount.toLocaleString()} of {totalCount.toLocaleString()} places
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Suggestion chips (show while loading or if no pins) */}
            {!hasSearched && totalCount === 0 && !pinLoadError && !pinsLoading && (
              <SuggestionChips
                suggestions={suggestions.slice(0, 5)}
                onSelect={search}
                className="justify-center"
              />
            )}

            {/* Pin loading error */}
            {pinLoadError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-sm text-destructive font-medium">Unable to load places</span>
                <button
                  onClick={() => {
                    setPinLoadError(false);
                    setPinsLoading(true);
                    fetch('/api/listings?limit=2000')
                      .then((res) => {
                        if (!res.ok) throw new Error();
                        return res.json();
                      })
                      .then((json) => {
                        const listings = json.data ?? [];
                        const pins: MapPinType[] = listings
                          .filter((l: { latitude: number; longitude: number }) =>
                            Number.isFinite(l.latitude) && Number.isFinite(l.longitude)
                          )
                          .map((l: { id: string; title: string; slug: string; latitude: number; longitude: number; category: string; rating: number | null; review_count: number; city: string; region: string }) => ({
                            id: l.id, lat: l.latitude, lng: l.longitude,
                            title: l.title, slug: l.slug, category: l.category,
                            rating: l.rating ?? undefined, reviewCount: l.review_count,
                            city: l.city, region: l.region, listingId: l.id,
                          }));
                        const counts: Record<string, number> = {};
                        for (const p of pins) {
                          const key = normalizeCategory(p.category);
                          counts[key] = (counts[key] || 0) + 1;
                        }
                        setAllPins(pins);
                        setPins(pins);
                        setTotalCount(pins.length);
                        setFilteredCount(pins.length);
                        setCategoryCounts(counts);
                      })
                      .catch(() => setPinLoadError(true))
                      .finally(() => setPinsLoading(false));
                  }}
                  className="text-xs font-medium text-destructive underline hover:no-underline"
                >
                  Retry
                </button>
              </div>
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

        {/* City sidebar — bottom left */}
        {!hasSearched && totalCount > 0 && (
          <div className="pointer-events-auto absolute bottom-20 left-4 z-10">
            <CitySidebar
              pins={allPins}
              activeCity={cityFilter}
              onSelectCity={handleCitySelect}
              onClear={handleCityClear}
            />
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

      {/* Listing detail modal — centered */}
      {selectedPin && (
        <ListingModal
          pin={selectedPin}
          onClose={() => setSelectedPin(null)}
        />
      )}

      {/* Itinerary side panel */}
      {itineraryOpen && <ItineraryPanel />}

      {/* Filter overlay */}
      {isFilterOpen && <FilterOverlay onClose={toggleFilterPanel} />}
    </div>
  );
}
