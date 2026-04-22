'use client';

import { useState, useMemo } from 'react';
import { Search, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MapPin as MapPinType } from '@/types/map';

interface CitySidebarProps {
  pins: MapPinType[];
  activeCity: string | null;
  onSelectCity: (city: { name: string; lat: number; lng: number; isRegion?: boolean }) => void;
  onClear: () => void;
}

interface CityEntry {
  name: string;
  count: number;
  lat: number;
  lng: number;
}

export function CitySidebar({ pins, activeCity, onSelectCity, onClear }: CitySidebarProps) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  // Build sorted city list from pins
  const cities = useMemo<CityEntry[]>(() => {
    const map = new Map<string, { count: number; lat: number; lng: number }>();
    for (const pin of pins) {
      const city = pin.city || pin.region || 'Unknown';
      if (map.has(city)) {
        map.get(city)!.count++;
      } else {
        map.set(city, { count: 1, lat: pin.lat, lng: pin.lng });
      }
    }
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [pins]);

  // Filter by search
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return cities;
    return cities.filter((c) => c.name.toLowerCase().includes(q));
  }, [query, cities]);

  if (pins.length === 0) return null;

  return (
    <div
      className="bg-background/95 backdrop-blur-sm rounded-xl shadow-lg border flex flex-col min-w-[200px] max-w-[240px] overflow-hidden"
      role="navigation"
      aria-label="Browse by city"
    >
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between w-full px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
        aria-expanded={!collapsed}
      >
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Cities ({cities.length})
        </span>
        {collapsed ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      {!collapsed && (
        <>
          {/* Search */}
          <div className="px-2.5 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search cities..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg bg-muted/50 border-0 focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/60"
                aria-label="Filter cities"
              />
            </div>
          </div>

          {/* "All" option */}
          {activeCity && (
            <button
              onClick={onClear}
              className="flex items-center gap-2 mx-2.5 mb-1 px-2.5 py-1.5 rounded-lg text-xs text-primary font-medium hover:bg-primary/5 transition-colors"
            >
              Show all places
            </button>
          )}

          {/* City list */}
          <div className="overflow-y-auto max-h-[320px] overscroll-contain px-1.5 pb-2 space-y-0.5">
            {filtered.length > 0 ? (
              filtered.map((city) => {
                const isActive = activeCity === city.name;
                return (
                  <button
                    key={city.name}
                    onClick={() => isActive ? onClear() : onSelectCity({ name: city.name, lat: city.lat, lng: city.lng })}
                    className={cn(
                      'flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs text-left transition-all duration-150 min-h-[36px]',
                      'hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary',
                      isActive && 'bg-primary/10 text-primary font-medium'
                    )}
                    aria-pressed={isActive}
                  >
                    <MapPin className={cn(
                      'w-3 h-3 flex-shrink-0',
                      isActive ? 'text-primary' : 'text-muted-foreground/50'
                    )} />
                    <span className="flex-1 truncate">{city.name}</span>
                    <span className={cn(
                      'tabular-nums flex-shrink-0',
                      isActive ? 'text-primary' : 'text-muted-foreground/60'
                    )}>
                      {city.count}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="text-center text-xs text-muted-foreground py-4">
                No cities match &ldquo;{query}&rdquo;
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
