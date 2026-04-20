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
    <div role="group" aria-label={`Rating: ${rating} out of ${maxRating} stars`} className={cn('flex items-center gap-0.5', className)}>
      {Array.from({ length: maxRating }).map((_, i) => {
        const value = i + 1;
        const isFilled = value <= rating;
        const isHalf = !isFilled && value - 0.5 <= rating;

        const starIcon = (
          <Star
            className={cn(sizeClasses[size], {
              'fill-accent text-accent': isFilled,
              'fill-accent/50 text-accent': isHalf,
              'fill-none text-muted-foreground/40': !isFilled && !isHalf,
            })}
          />
        );

        if (!interactive) {
          return (
            <span key={i} aria-hidden="true">
              {starIcon}
            </span>
          );
        }

        return (
          <button
            key={i}
            type="button"
            onClick={() => handleClick(value)}
            className="cursor-pointer hover:scale-110 transition-transform focus:outline-none"
            aria-label={`${value} star${value !== 1 ? 's' : ''}`}
          >
            {starIcon}
          </button>
        );
      })}
      {showValue && (
        <span className="ml-1 text-sm text-muted-foreground">{rating.toFixed(1)}</span>
      )}
    </div>
  );
}
