'use client';

import { DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface CostEstimatorProps {
  totalCost: number;
  breakdown?: { label: string; amount: number }[];
  className?: string;
}

export function CostEstimator({ totalCost, breakdown, className }: CostEstimatorProps) {
  return (
    <div className={cn('bg-muted/30 rounded-xl p-4 space-y-3', className)}>
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-green-500" />
        <span className="font-semibold text-sm">Estimated Cost</span>
      </div>

      {breakdown && breakdown.length > 0 && (
        <div className="space-y-1.5">
          {breakdown.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium">{formatCurrency(item.amount)}</span>
            </div>
          ))}
          <div className="h-px bg-border mt-2" />
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">Total</span>
        <span className="text-lg font-bold text-primary">
          {totalCost > 0 ? formatCurrency(totalCost) : 'Free / TBD'}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {totalCost > 0
          ? 'Approximate per person'
          : 'Add experiences with prices to see cost estimates'}
      </p>
    </div>
  );
}
