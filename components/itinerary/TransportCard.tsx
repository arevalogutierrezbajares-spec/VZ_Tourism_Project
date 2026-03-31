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
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ArrowDown className="w-3 h-3" />
        <Icon className="w-3 h-3" />
        <span>
          {label || config.label}
          {duration && ` · ${duration < 60 ? `${duration}min` : `${Math.round(duration / 60)}h`}`}
          {distance && ` · ${distance.toFixed(1)}km`}
        </span>
        <ArrowDown className="w-3 h-3" />
      </div>
    </div>
  );
}
