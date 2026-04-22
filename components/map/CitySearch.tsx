'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { MapPin, Search, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VENEZUELA_REGIONS } from '@/lib/constants';
import type { MapPin as MapPinType } from '@/types/map';

interface CityGroup {
  region: string;
  cities: { name: string; count: number; lat: number; lng: number }[];
}

interface CitySearchProps {
  pins: MapPinType[];
  onSelectCity: (city: { name: string; lat: number; lng: number; isRegion?: boolean }) => void;
  onClear: () => void;
  className?: string;
}

export function CitySearch({ pins, onSelectCity, onClear, className }: CitySearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  // Build city groups from pin data
  const cityGroups = useMemo<CityGroup[]>(() => {
    const regionMap = new Map<string, Map<string, { count: number; lat: number; lng: number }>>();

    for (const pin of pins) {
      const region = pin.region || 'Other';
      const city = pin.city || 'Unknown';

      if (!regionMap.has(region)) regionMap.set(region, new Map());
      const cities = regionMap.get(region)!;
      if (cities.has(city)) {
        cities.get(city)!.count++;
      } else {
        cities.set(city, { count: 1, lat: pin.lat, lng: pin.lng });
      }
    }

    return Array.from(regionMap.entries())
      .map(([region, cities]) => ({
        region,
        cities: Array.from(cities.entries())
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => {
        const totalA = a.cities.reduce((s, c) => s + c.count, 0);
        const totalB = b.cities.reduce((s, c) => s + c.count, 0);
        return totalB - totalA;
      });
  }, [pins]);

  // Filter cities/regions by query
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return cityGroups;

    return cityGroups
      .map((group) => ({
        ...group,
        cities: group.cities.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            group.region.toLowerCase().includes(q)
        ),
      }))
      .filter((group) => group.cities.length > 0);
  }, [query, cityGroups]);

  // Matching known regions for quick-select
  const matchingRegions = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return VENEZUELA_REGIONS;
    return VENEZUELA_REGIONS.filter((r) => r.name.toLowerCase().includes(q));
  }, [query]);

  const handleSelect = (city: { name: string; lat: number; lng: number; isRegion?: boolean }) => {
    setSelectedLabel(city.name);
    setQuery('');
    setOpen(false);
    onSelectCity(city);
  };

  const handleClear = () => {
    setSelectedLabel('');
    setQuery('');
    onClear();
  };

  return (
    <div className={cn('relative', className)} ref={panelRef}>
      {/* Trigger — Airbnb-style pill */}
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls="city-search-listbox"
        aria-haspopup="listbox"
        aria-label="Search cities and regions"
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className={cn(
          'flex items-center gap-2 h-12 rounded-2xl border bg-background shadow-lg px-4 text-sm transition-all duration-200',
          'hover:shadow-xl focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          open && 'ring-2 ring-primary shadow-xl',
          selectedLabel ? 'text-foreground font-medium' : 'text-muted-foreground'
        )}
      >
        <MapPin className="w-4 h-4 flex-shrink-0 text-primary" />
        <span className="truncate max-w-[140px]">
          {selectedLabel || 'Where'}
        </span>
        {selectedLabel && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="ml-auto p-0.5 rounded-full hover:bg-muted transition-colors"
            aria-label="Clear location"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={cn(
            'absolute top-full left-0 mt-2 w-[340px] max-h-[420px] overflow-hidden',
            'bg-background border rounded-2xl shadow-2xl z-50',
            'animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150'
          )}
        >
          {/* Search input */}
          <div className="p-3 border-b">
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search cities or regions..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-muted/50 border-0 focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                aria-label="Search cities"
              />
            </div>
          </div>

          {/* Results */}
          <div id="city-search-listbox" role="listbox" aria-label="Cities and regions" className="overflow-y-auto max-h-[350px] overscroll-contain">
            {/* Quick region picks (Airbnb-style grid) */}
            {!query && (
              <div className="p-3 border-b">
                <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
                  Popular regions
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {VENEZUELA_REGIONS.slice(0, 6).map((region) => (
                    <button
                      key={region.id}
                      type="button"
                      role="option"
                      aria-selected={selectedLabel === region.name}
                      onClick={() =>
                        handleSelect({
                          name: region.name,
                          lat: region.lat,
                          lng: region.lng,
                          isRegion: true,
                        })
                      }
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left hover:bg-muted transition-colors"
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor:
                            region.safetyLevel === 'green'
                              ? '#22C55E'
                              : region.safetyLevel === 'yellow'
                                ? '#EAB308'
                                : '#F97316',
                        }}
                      />
                      <span className="truncate font-medium">{region.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Region grid when searching */}
            {query && matchingRegions.length > 0 && (
              <div className="p-3 border-b">
                <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
                  Regions
                </p>
                {matchingRegions.map((region) => (
                  <button
                    key={region.id}
                    type="button"
                    role="option"
                    aria-selected={selectedLabel === region.name}
                    onClick={() =>
                      handleSelect({
                        name: region.name,
                        lat: region.lat,
                        lng: region.lng,
                        isRegion: true,
                      })
                    }
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-left hover:bg-muted transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-medium">{region.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">Region</span>
                  </button>
                ))}
              </div>
            )}

            {/* City list grouped by region */}
            {filtered.length > 0 ? (
              <div className="p-2">
                {filtered.map((group) => (
                  <div key={group.region} className="mb-1">
                    <p className="text-xs font-medium text-muted-foreground px-2 py-1.5 sticky top-0 bg-background">
                      {group.region}
                    </p>
                    {group.cities.slice(0, query ? 10 : 4).map((city) => (
                      <button
                        key={`${group.region}-${city.name}`}
                        type="button"
                        role="option"
                        aria-selected={selectedLabel === city.name}
                        onClick={() => handleSelect({ name: city.name, lat: city.lat, lng: city.lng })}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-left hover:bg-muted transition-colors group"
                      >
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                        <span className="truncate">{city.name}</span>
                        <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                          {city.count} {city.count === 1 ? 'place' : 'places'}
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No cities found for &ldquo;{query}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
