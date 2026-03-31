'use client';

import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center space-y-4',
        className
      )}
    >
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Icon className="w-8 h-8 text-muted-foreground" />
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
      </div>
      {actionLabel && (onAction || actionHref) && (
        actionHref ? (
          <a href={actionHref} className="inline-flex items-center justify-center border rounded-lg px-2.5 py-1.5 text-sm font-medium hover:bg-muted transition-colors">
            {actionLabel}
          </a>
        ) : (
          <Button onClick={onAction} variant="outline">{actionLabel}</Button>
        )
      )}
    </div>
  );
}
