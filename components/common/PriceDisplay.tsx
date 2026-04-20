'use client';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';

interface PriceDisplayProps {
  priceUsd: number;
  priceVes?: number | null;
  showBothCurrencies?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  suffix?: string;
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg font-semibold',
  xl: 'text-2xl font-bold',
};

export function PriceDisplay({
  priceUsd,
  priceVes,
  showBothCurrencies = false,
  size = 'md',
  className,
  suffix,
}: PriceDisplayProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      <span className={cn('text-foreground font-medium', sizeClasses[size])}>
        {formatCurrency(priceUsd, 'USD')}
        {suffix && <span className="text-muted-foreground font-normal text-sm ml-1">{suffix}</span>}
      </span>
      {showBothCurrencies && priceVes && (
        <span className="text-xs text-muted-foreground">
          ≈ {formatCurrency(priceVes, 'VES')}
        </span>
      )}
    </div>
  );
}
