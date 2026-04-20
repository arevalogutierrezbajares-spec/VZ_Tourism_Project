'use client';

import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const sizeConfig = {
  sm: { mark: 'text-lg', text: 'text-base' },
  md: { mark: 'text-2xl', text: 'text-xl' },
  lg: { mark: 'text-3xl', text: 'text-2xl' },
};

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
  const config = sizeConfig[size];

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'font-heading font-semibold tracking-tight text-accent',
          config.mark
        )}
      >
        VZ
      </span>
      {showText && (
        <span className={cn('font-body font-medium tracking-tight text-foreground', config.text)}>
          Explorer
        </span>
      )}
    </div>
  );
}
