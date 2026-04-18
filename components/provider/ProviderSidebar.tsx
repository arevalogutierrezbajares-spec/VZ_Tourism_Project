'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  List,
  Calendar,
  BookOpen,
  BarChart3,
  Share2,
  DollarSign,
  Users,
  Settings,
  ChevronLeft,
  Wallet,
  MessageCircle,
  Brain,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/common/Logo';
import { useProviderStore } from '@/stores/provider-store';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { href: '/dashboard/listings', icon: List, label: 'Listings' },
  { href: '/dashboard/bookings', icon: BookOpen, label: 'Bookings' },
  { href: '/dashboard/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/dashboard/marketing', icon: Share2, label: 'Marketing' },
  { href: '/dashboard/revenue', icon: DollarSign, label: 'Revenue' },
  { href: '/dashboard/payouts', icon: Wallet, label: 'Payouts' },
  { href: '/dashboard/guests', icon: Users, label: 'Guests' },
  { href: '/dashboard/messages', icon: MessageCircle, label: 'Messages' },
  { href: '/dashboard/messages/brain', icon: Brain, label: 'AI Brain' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export function ProviderSidebar() {
  const pathname = usePathname();
  const { unreadCount, waUnreadCount } = useProviderStore();

  return (
    <aside className="w-64 flex-shrink-0 border-r bg-background flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b">
        <Logo size="sm" />
        <p className="text-xs text-muted-foreground mt-1">Provider Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.label === 'Bookings' && unreadCount > 0 && (
                  <Badge className="bg-red-500 text-white text-xs px-1.5 h-5 min-w-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
                {item.label === 'Messages' && waUnreadCount > 0 && (
                  <Badge className="bg-green-500 text-white text-xs px-1.5 h-5 min-w-5 flex items-center justify-center">
                    {waUnreadCount > 9 ? '9+' : waUnreadCount}
                  </Badge>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Back to app */}
      <div className="p-4 border-t">
        <Link href="/" className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors w-full">
          <ChevronLeft className="w-4 h-4" />
          Back to app
        </Link>
      </div>
    </aside>
  );
}
