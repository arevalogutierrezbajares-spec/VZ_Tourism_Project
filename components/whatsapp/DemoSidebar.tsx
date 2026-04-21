'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  MessageCircle, Settings, Brain, BarChart3,
  Layout, BookOpen, FlaskConical,
} from 'lucide-react';

const SIDEBAR_ITEMS = [
  { label: 'Overview',     href: null,                        icon: <Layout className="w-3.5 h-3.5" /> },
  { label: 'Listings',     href: null,                        icon: <BookOpen className="w-3.5 h-3.5" /> },
  { label: 'Bookings',     href: null,                        icon: <BookOpen className="w-3.5 h-3.5" /> },
  { label: 'Messages',     href: '/demo/whatsapp',            icon: <MessageCircle className="w-3.5 h-3.5" /> },
  { label: 'AI Brain',     href: '/demo/whatsapp/brain',      icon: <Brain className="w-3.5 h-3.5" /> },
  { label: 'Analytics',    href: null,                        icon: <BarChart3 className="w-3.5 h-3.5" /> },
  { label: 'AI Settings',  href: '/demo/whatsapp/settings',   icon: <Settings className="w-3.5 h-3.5" /> },
] as const;

export default function DemoSidebar() {
  const pathname = usePathname();

  return (
    <div className="w-56 shrink-0 border-r bg-card flex flex-col">
      <div className="p-4 border-b">
        <p className="text-sm font-bold text-foreground">Posada Demo</p>
        <p className="text-xs text-muted-foreground">Provider Dashboard</p>
      </div>
      <nav className="flex-1 p-2 space-y-0.5 text-sm">
        {SIDEBAR_ITEMS.map(({ label, href, icon }) => {
          const isActive = href ? pathname === href : false;
          const isDisabled = !href;

          if (isDisabled) {
            return (
              <div
                key={label}
                className="px-3 py-2 rounded-md text-sm text-muted-foreground/50 cursor-default flex items-center gap-2"
              >
                {icon}
                {label}
              </div>
            );
          }

          return (
            <Link
              key={label}
              href={href}
              className={cn(
                'px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {icon}
              {label}
              {label === 'Messages' && (
                <span className="ml-auto inline-flex items-center justify-center w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">3</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t">
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5">
          <div className="flex items-center gap-1.5 text-amber-700 mb-0.5">
            <FlaskConical className="w-3 h-3" />
            <span className="text-[10px] font-semibold">Demo mode</span>
          </div>
          <p className="text-[10px] text-amber-700 leading-relaxed">
            Mock data only. No live WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}
