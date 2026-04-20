'use client';

import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SafetyLevel } from '@/types/database';

interface SafetyBadgeProps {
  level: SafetyLevel;
  showIcon?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

const levelConfig: Record<SafetyLevel, { label: string; className: string }> = {
  green: { label: 'Safe', className: 'bg-status-confirmed/15 text-status-confirmed border-status-confirmed/30' },
  yellow: { label: 'Caution', className: 'bg-status-pending/15 text-status-pending border-status-pending/30' },
  orange: { label: 'High Caution', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  red: { label: 'Avoid', className: 'bg-status-cancelled/15 text-status-cancelled border-status-cancelled/30' },
};

export function SafetyBadge({ level, showIcon = true, className, size = 'md' }: SafetyBadgeProps) {
  const config = levelConfig[level];

  return (
    <Badge
      variant="outline"
      className={cn(config.className, 'transition-[background-color,color,border-color] duration-150 ease-out', size === 'sm' && 'text-xs px-1.5 py-0', className)}
    >
      {showIcon && <Shield className={cn('mr-1', size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3')} />}
      {config.label}
    </Badge>
  );
}
