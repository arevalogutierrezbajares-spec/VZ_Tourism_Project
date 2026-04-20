'use client';

import { useState, useEffect } from 'react';
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
  Bot,
  Hotel,
  Menu,
  X,
  Wand2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/common/Logo';
import { NotificationBell } from '@/components/common/NotificationBell';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useProviderStore } from '@/stores/provider-store';
import { useRealtimeBookings } from '@/hooks/use-realtime';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: 'bookings' | 'messages';
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: 'Operations',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
      { href: '/dashboard/bookings', icon: BookOpen, label: 'Bookings', badge: 'bookings' },
      { href: '/dashboard/calendar', icon: Calendar, label: 'Calendar' },
    ],
  },
  {
    title: 'WhatsApp',
    items: [
      { href: '/dashboard/whatsapp', icon: MessageCircle, label: 'Conversations', badge: 'messages' },
      { href: '/dashboard/whatsapp/brain', icon: Brain, label: 'AI Brain' },
      { href: '/dashboard/whatsapp/settings', icon: Bot, label: 'AI Settings' },
      { href: '/dashboard/whatsapp/setup', icon: Wand2, label: 'Setup' },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { href: '/dashboard/listings', icon: List, label: 'Listings' },
    ],
  },
  {
    title: 'Growth',
    items: [
      { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
      { href: '/dashboard/marketing', icon: Share2, label: 'Marketing' },
      { href: '/dashboard/revenue', icon: DollarSign, label: 'Revenue' },
      { href: '/dashboard/payouts', icon: Wallet, label: 'Payouts' },
      { href: '/dashboard/guests', icon: Users, label: 'Guests' },
    ],
  },
  {
    title: 'Property (PMS)',
    items: [
      { href: '/dashboard/pms', icon: Hotel, label: 'Posada PMS' },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

function NavItemLink({
  item,
  isActive,
  collapsed,
  unreadCount,
  waUnreadCount,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  unreadCount: number;
  waUnreadCount: number;
  onClick?: () => void;
}) {
  const badgeCount =
    item.badge === 'bookings' ? unreadCount :
    item.badge === 'messages' ? waUnreadCount : 0;

  const content = (
    <Link href={item.href} onClick={onClick}>
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
          collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
      >
        <item.icon className="w-4 h-4 flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {badgeCount > 0 && (
              <Badge
                className={cn(
                  'text-white text-xs px-1.5 h-5 min-w-5 flex items-center justify-center',
                  item.badge === 'messages' ? 'bg-status-confirmed' : 'bg-status-cancelled'
                )}
              >
                {badgeCount > 9 ? '9+' : badgeCount}
              </Badge>
            )}
          </>
        )}
        {collapsed && badgeCount > 0 && (
          <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-status-cancelled" />
        )}
      </div>
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger className="relative w-full">
          {content}
        </TooltipTrigger>
        <TooltipContent side="right">
          {item.label}
          {badgeCount > 0 && ` (${badgeCount})`}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

function SidebarNav({
  collapsed,
  unreadCount,
  waUnreadCount,
  onNavigate,
}: {
  collapsed: boolean;
  unreadCount: number;
  waUnreadCount: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
      {navGroups.map((group) => (
        <div key={group.title}>
          {!collapsed && (
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {group.title}
            </p>
          )}
          {collapsed && <div className="mx-auto mb-1 w-6 border-t border-border" />}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const isActive =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href);

              return (
                <NavItemLink
                  key={item.href}
                  item={item}
                  isActive={isActive}
                  collapsed={collapsed}
                  unreadCount={unreadCount}
                  waUnreadCount={waUnreadCount}
                  onClick={onNavigate}
                />
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function ProviderSidebar() {
  const { unreadCount, waUnreadCount, provider, setUnreadCount } = useProviderStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  // Wire realtime bookings to increment badge (P1-PRV-003)
  useRealtimeBookings(provider?.id, () => {
    setUnreadCount(unreadCount + 1);
  });

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <TooltipProvider>
      {/* Mobile top bar: visible below md */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center h-14 px-4 border-b bg-background md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center justify-center w-10 h-10 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="ml-2 flex-1">
          <Logo size="sm" />
        </div>
        <NotificationBell />
      </div>

      {/* Mobile sheet drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b">
            <SheetTitle>Provider Dashboard</SheetTitle>
          </SheetHeader>
          <SidebarNav
            collapsed={false}
            unreadCount={unreadCount}
            waUnreadCount={waUnreadCount}
            onNavigate={() => setMobileOpen(false)}
          />
          <div className="p-3 border-t">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors w-full"
              onClick={() => setMobileOpen(false)}
            >
              <ChevronLeft className="w-4 h-4" />
              Back to app
            </Link>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop/Tablet sidebar: hidden below md */}
      <aside
        className={cn(
          'hidden md:flex flex-shrink-0 border-r bg-background flex-col h-full transition-[width] duration-200 ease-in-out',
          collapsed ? 'w-14' : 'w-60'
        )}
      >
        {/* Logo + collapse toggle */}
        <div className={cn('flex items-center border-b', collapsed ? 'justify-center p-3' : 'justify-between p-4')}>
          {!collapsed && (
            <div>
              <Logo size="sm" />
              <p className="text-[10px] text-muted-foreground mt-0.5">Provider Dashboard</p>
            </div>
          )}
          <div className="flex items-center gap-1">
            {!collapsed && <NotificationBell />}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronLeft className={cn('w-4 h-4 transition-transform duration-200', collapsed && 'rotate-180')} />
            </button>
          </div>
        </div>

        <SidebarNav
          collapsed={collapsed}
          unreadCount={unreadCount}
          waUnreadCount={waUnreadCount}
        />

        {/* Back to app */}
        <div className={cn('border-t', collapsed ? 'p-2' : 'p-3')}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    href="/"
                    className="flex items-center justify-center w-full py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Back to app"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Link>
                }
              />
              <TooltipContent side="right">Back to app</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors w-full"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to app
            </Link>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
