'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useSearchStore } from '@/stores/search-store';
import { LISTING_CATEGORIES, VENEZUELA_REGIONS, SAFETY_LEVELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface FilterOverlayProps {
  onClose: () => void;
}

export function FilterOverlay({ onClose }: FilterOverlayProps) {
  const { filters, setFilters, resetFilters } = useSearchStore();

  const handleCategoryToggle = (category: string) => {
    setFilters({
      ...filters,
      category: filters.category === category ? undefined : category,
    });
  };

  const handleRegionToggle = (region: string) => {
    setFilters({
      ...filters,
      region: filters.region === region ? undefined : region,
    });
  };

  const handleSafetyToggle = (level: string) => {
    setFilters({
      ...filters,
      safetyLevel: filters.safetyLevel === level ? undefined : level,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Filters">
      <div className="bg-background rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-background flex items-center justify-between p-5 border-b z-10">
          <h2 className="font-bold text-lg">Filters</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Clear all
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close filters">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* Category */}
          <div>
            <h3 className="font-semibold mb-3">Category</h3>
            <div className="grid grid-cols-2 gap-2">
              {LISTING_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => handleCategoryToggle(cat.value)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary',
                    filters.category === cat.value
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:border-foreground/30'
                  )}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Region */}
          <div>
            <h3 className="font-semibold mb-3">Region</h3>
            <div className="flex flex-wrap gap-2">
              {VENEZUELA_REGIONS.map((region) => (
                <Badge
                  key={region.id}
                  variant={filters.region === region.name ? 'default' : 'outline'}
                  className="cursor-pointer text-xs"
                  onClick={() => handleRegionToggle(region.name)}
                >
                  {region.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div>
            <h3 className="font-semibold mb-3">
              Price Range
              <span className="font-normal text-muted-foreground ml-2 text-sm">
                ${filters.minPrice || 0} - ${filters.maxPrice || 1000}+
              </span>
            </h3>
            <Slider
              min={0}
              max={1000}
              step={10}
              value={[filters.minPrice || 0, filters.maxPrice || 1000]}
              onValueChange={(vals) => {
                const arr = Array.isArray(vals) ? vals : [vals];
                setFilters({ ...filters, minPrice: arr[0] as number, maxPrice: arr[1] as number });
              }}
              className="mt-2"
            />
          </div>

          {/* Safety level */}
          <div>
            <h3 className="font-semibold mb-3">Safety Level</h3>
            <div className="flex flex-wrap gap-2">
              {SAFETY_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => handleSafetyToggle(level.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary',
                    filters.safetyLevel === level.value
                      ? 'border-current font-medium shadow-sm'
                      : 'border-border hover:border-foreground/30'
                  )}
                  style={
                    filters.safetyLevel === level.value
                      ? { borderColor: level.color, color: level.color, backgroundColor: `${level.color}15` }
                      : {}
                  }
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-background p-5 border-t">
          <Button className="w-full" onClick={onClose}>
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
