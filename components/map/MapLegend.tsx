'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useMapStore } from '@/stores/map-store';
import { BUSINESS_CATEGORIES } from '@/lib/mapbox/helpers';
import type { MapPin } from '@/types/map';

interface MapLegendProps {
  pins: MapPin[];
}

export function MapLegend({ pins }: MapLegendProps) {
  const { hiddenCategories, toggleCategory } = useMapStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const counts = pins.reduce<Record<string, number>>((acc, pin) => {
    const cat = pin.category ?? 'other';
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {});

  if (pins.length === 0) return null;

  const visibleCategories = BUSINESS_CATEGORIES.filter(({ key }) => (counts[key] ?? 0) > 0);

  return (
    <div
      className="bg-background/90 backdrop-blur-sm rounded-xl shadow-lg border p-3 min-w-[180px] max-w-[220px]"
      role="region"
      aria-label="Map category legend"
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between w-full text-left focus-visible:ring-2 focus-visible:ring-primary rounded-md"
        aria-expanded={!isCollapsed}
        aria-controls="legend-categories"
      >
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Categories ({visibleCategories.length})
        </span>
        {isCollapsed ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
        )}
      </button>
      {!isCollapsed && (
        <div id="legend-categories" className="space-y-1.5 mt-2">
          {visibleCategories.map(({ key, label, color }) => {
            const count = counts[key] ?? 0;
            const hidden = hiddenCategories.has(key);
            return (
              <button
                key={key}
                onClick={() => toggleCategory(key)}
                className={`flex items-center gap-2 w-full text-left rounded-lg px-2 py-1.5 min-h-[36px] transition-opacity hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary ${
                  hidden ? 'opacity-40' : 'opacity-100'
                }`}
                aria-pressed={!hidden}
                aria-label={`${label}: ${count} ${count === 1 ? 'listing' : 'listings'}${hidden ? ' (hidden)' : ''}`}
              >
                <span
                  className="flex-shrink-0 w-3 h-3 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span className="text-xs text-foreground flex-1 leading-none">
                  {label}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">{count.toLocaleString()}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
