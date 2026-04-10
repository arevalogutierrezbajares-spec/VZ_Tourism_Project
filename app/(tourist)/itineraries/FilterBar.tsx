'use client';

import { cn } from '@/lib/utils';

export interface Filters {
  region: string | null;
  durationMin: number | null;
  durationMax: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
  sort: 'popular' | 'newest' | 'price';
}

interface FilterBarProps {
  regions: string[];
  filters: Filters;
  onChange: (filters: Filters) => void;
}

const DURATION_OPTIONS = [
  { label: '3-5 days', min: 3, max: 5 },
  { label: '7 days', min: 6, max: 8 },
  { label: '10+ days', min: 10, max: null },
];

const BUDGET_OPTIONS = [
  { label: 'Under $500', min: null, max: 500 },
  { label: '$500-$1500', min: 500, max: 1500 },
  { label: 'Luxury', min: 1500, max: null },
];

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all whitespace-nowrap focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background text-muted-foreground border-border hover:border-primary/50'
      )}
    >
      {label}
    </button>
  );
}

export function FilterBar({ regions, filters, onChange }: FilterBarProps) {
  const toggleRegion = (r: string) => {
    onChange({ ...filters, region: filters.region === r ? null : r });
  };

  const toggleDuration = (min: number, max: number | null) => {
    const isActive = filters.durationMin === min && filters.durationMax === max;
    onChange({
      ...filters,
      durationMin: isActive ? null : min,
      durationMax: isActive ? null : max,
    });
  };

  const toggleBudget = (min: number | null, max: number | null) => {
    const isActive = filters.budgetMin === min && filters.budgetMax === max;
    onChange({
      ...filters,
      budgetMin: isActive ? null : min,
      budgetMax: isActive ? null : max,
    });
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {regions.map((r) => (
        <Chip
          key={r}
          label={r}
          active={filters.region === r}
          onClick={() => toggleRegion(r)}
        />
      ))}

      <div className="w-px h-6 bg-border self-center mx-1" />

      {DURATION_OPTIONS.map((opt) => (
        <Chip
          key={opt.label}
          label={opt.label}
          active={filters.durationMin === opt.min && filters.durationMax === opt.max}
          onClick={() => toggleDuration(opt.min, opt.max)}
        />
      ))}

      <div className="w-px h-6 bg-border self-center mx-1" />

      {BUDGET_OPTIONS.map((opt) => (
        <Chip
          key={opt.label}
          label={opt.label}
          active={filters.budgetMin === opt.min && filters.budgetMax === opt.max}
          onClick={() => toggleBudget(opt.min, opt.max)}
        />
      ))}
    </div>
  );
}
