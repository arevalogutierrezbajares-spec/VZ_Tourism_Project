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
  green: { label: 'Safe', className: 'bg-green-100 text-green-800 border-green-200' },
  yellow: { label: 'Caution', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  orange: { label: 'High Caution', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  red: { label: 'Avoid', className: 'bg-red-100 text-red-800 border-red-200' },
};

export function SafetyBadge({ level, showIcon = true, className, size = 'md' }: SafetyBadgeProps) {
  const config = levelConfig[level];

  return (
    <Badge
      variant="outline"
      className={cn(config.className, size === 'sm' && 'text-xs px-1.5 py-0', className)}
    >
      {showIcon && <Shield className={cn('mr-1', size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3')} />}
      {config.label}
    </Badge>
  );
}
