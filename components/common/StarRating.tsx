'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  className?: string;
  showValue?: boolean;
}

const sizeClasses = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  interactive = false,
  onRatingChange,
  className,
  showValue = false,
}: StarRatingProps) {
  const handleClick = (value: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(value);
    }
  };

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {Array.from({ length: maxRating }).map((_, i) => {
        const value = i + 1;
        const isFilled = value <= rating;
        const isHalf = !isFilled && value - 0.5 <= rating;

        return (
          <button
            key={i}
            type="button"
            onClick={() => handleClick(value)}
            disabled={!interactive}
            className={cn(
              'focus:outline-none',
              interactive && 'cursor-pointer hover:scale-110 transition-transform'
            )}
            aria-label={`${value} star${value !== 1 ? 's' : ''}`}
          >
            <Star
              className={cn(sizeClasses[size], {
                'fill-amber-400 text-amber-400': isFilled,
                'fill-amber-200 text-amber-400': isHalf,
                'fill-none text-gray-300': !isFilled && !isHalf,
              })}
            />
          </button>
        );
      })}
      {showValue && (
        <span className="ml-1 text-sm text-muted-foreground">{rating.toFixed(1)}</span>
      )}
    </div>
  );
}
