'use client';

import { Car, Footprints, Bike, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransportCardProps {
  mode?: 'driving' | 'walking' | 'cycling';
  duration?: number;
  distance?: number;
  label?: string;
  className?: string;
}

const modeConfig = {
  driving: { icon: Car, label: 'Drive' },
  walking: { icon: Footprints, label: 'Walk' },
  cycling: { icon: Bike, label: 'Cycle' },
};

export function TransportCard({
  mode = 'driving',
  duration,
  distance,
  label,
  className,
}: TransportCardProps) {
  const config = modeConfig[mode];
  const Icon = config.icon;

  return (
    <div className={cn('flex flex-col items-center py-2', className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
        <ArrowDown className="w-3 h-3 opacity-40" />
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 border border-border/50">
          <Icon className="w-3 h-3" />
          <span>
            {label || config.label}
            {duration != null && ` · ${duration < 60 ? `${duration}min` : `${Math.round(duration / 60)}h`}`}
            {distance != null && ` · ${distance.toFixed(1)}km`}
          </span>
        </div>
        <ArrowDown className="w-3 h-3 opacity-40" />
      </div>
    </div>
  );
}
