'use client';

import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  className?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeLabel = 'vs last month',
  icon: Icon,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
  className,
}: StatsCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <Card className={cn('', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1 text-xs">
                {isPositive ? (
                  <TrendingUp className="w-3 h-3 text-status-confirmed" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-destructive" />
                )}
                <span className={isPositive ? 'text-status-confirmed' : 'text-destructive'}>
                  {isPositive ? '+' : ''}{change.toFixed(1)}%
                </span>
                <span className="text-muted-foreground">{changeLabel}</span>
              </div>
            )}
          </div>
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', iconBg)}>
            <Icon className={cn('w-5 h-5', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
