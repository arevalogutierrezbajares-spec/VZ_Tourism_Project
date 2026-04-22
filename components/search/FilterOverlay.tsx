'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle } from 'lucide-react';
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
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape key closes the overlay
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Focus trap: keep Tab within the panel
  const handleFocusTrap = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  // Auto-focus the panel on mount
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

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
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Filters"
      onClick={onClose}
      onKeyDown={handleFocusTrap}
    >
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="bg-background rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl focus:outline-none"
        initial={{ opacity: 0, y: 24, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -12, transition: { duration: 0.15 } }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-background flex items-center justify-between p-5 border-b z-10">
          <h2 className="font-bold text-lg text-balance">Filters</h2>
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
                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary active:scale-[0.96]',
                    'transition-[background-color,border-color,color,transform] duration-150',
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
                  role="button"
                  tabIndex={0}
                  onClick={() => handleRegionToggle(region.name)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRegionToggle(region.name);
                    }
                  }}
                >
                  {region.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div>
            <h3 className="font-semibold mb-3 text-balance">
              Price Range
              <span className="font-normal text-muted-foreground ml-2 text-sm tabular-nums">
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
                    'px-3 py-1.5 rounded-full text-sm border cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary active:scale-[0.96]',
                    'transition-[background-color,border-color,color,box-shadow,transform] duration-150',
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
                  {filters.safetyLevel === level.value && (
                    <CheckCircle className="w-3.5 h-3.5 mr-1 inline" aria-hidden="true" />
                  )}
                  {level.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-background p-5 border-t">
          <Button className="w-full active:scale-[0.96] transition-[transform] duration-100" onClick={onClose}>
            Apply Filters
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
