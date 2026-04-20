'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Route, Luggage, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/', icon: Home, label: 'Home', match: (p: string) => p === '/' },
  { href: '/explore', icon: Compass, label: 'Explore', match: (p: string) => p.startsWith('/explore') || p.startsWith('/discover') || p.startsWith('/listing') },
  { href: '/plan', icon: Route, label: 'Plan', match: (p: string) => p.startsWith('/plan') || p.startsWith('/itineraries') },
  { href: '/trips', icon: Luggage, label: 'Trips', match: (p: string) => p.startsWith('/trips') },
  { href: '/account', icon: User, label: 'Profile', match: (p: string) => p.startsWith('/account') || p.startsWith('/login') },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              aria-label={tab.label}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-lg transition-colors',
                'min-h-[44px] min-w-[44px]',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground'
              )}
            >
              <tab.icon className={cn('w-5 h-5', active && 'stroke-[2.5]')} />
              <span className={cn('text-[10px] leading-tight', active ? 'font-semibold' : 'font-medium')}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe area for devices with home indicator */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
