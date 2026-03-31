'use client';

import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const sizeConfig = {
  sm: { icon: 'w-6 h-6', text: 'text-base' },
  md: { icon: 'w-8 h-8', text: 'text-xl' },
  lg: { icon: 'w-10 h-10', text: 'text-2xl' },
};

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
  const config = sizeConfig[size];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          config.icon,
          'rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-md'
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4"
        >
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      </div>
      {showText && (
        <span className={cn('font-bold tracking-tight', config.text)}>
          <span className="text-sky-600">VZ</span>
          <span className="text-gray-900 dark:text-white"> Explorer</span>
        </span>
      )}
    </div>
  );
}
