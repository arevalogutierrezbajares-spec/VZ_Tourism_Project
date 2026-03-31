'use client';

import { cn } from '@/lib/utils';

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  className?: string;
}

export function SuggestionChips({ suggestions, onSelect, className }: SuggestionChipsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          onClick={() => onSelect(suggestion)}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
            'bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700',
            'hover:bg-primary hover:text-white hover:border-primary hover:shadow-md',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
            'backdrop-blur-sm'
          )}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
