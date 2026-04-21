'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Compass, LayoutDashboard, PlusCircle, Tag, DollarSign, ChevronRight, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';

const navItems = [
  { href: '/creator/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/creator/itineraries/new', label: 'New Itinerary', icon: PlusCircle },
  { href: '/creator/codes', label: 'Discount Codes', icon: Tag },
  { href: '/creator/earnings', label: 'Earnings', icon: DollarSign },
];

export default function CreatorPortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      const zustandUser = useAuthStore.getState().user;
      if (zustandUser) { setChecking(false); return; }
      router.replace('/auth/login?next=' + encodeURIComponent(pathname));
      return;
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        const zustandUser = useAuthStore.getState().user;
        if (zustandUser) { setChecking(false); return; }
        router.replace('/auth/login?next=' + encodeURIComponent(pathname));
      } else {
        setChecking(false);
      }
    });
  }, [router, pathname]);

  const handleSignOut = async () => {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.push('/');
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      {/* Sidebar — hidden on mobile, icon-only on tablet, full on desktop */}
      <aside className="hidden md:flex flex-col flex-shrink-0 bg-card border-r w-14 lg:w-56 transition-[width]">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-3 lg:px-5 py-4 border-b min-h-[57px]">
          <Compass className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="hidden lg:block">
            <p className="font-semibold text-sm">Creator Studio</p>
            <p className="text-[11px] text-muted-foreground leading-none mt-0.5">VZ Explorer</p>
          </div>
        </div>

        <nav className="flex-1 p-2 lg:p-3 space-y-0.5" aria-label="Creator navigation">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer min-h-[44px] ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span className="hidden lg:flex flex-1">{label}</span>
                {active && <ChevronRight className="w-3 h-3 opacity-60 hidden lg:block" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-2 lg:p-3 border-t space-y-0.5">
          <Link
            href="/"
            title="Back to app"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[44px]"
          >
            <Compass className="w-3.5 h-3.5 flex-shrink-0 rotate-180" aria-hidden="true" />
            <span className="hidden lg:block">← Back to app</span>
          </Link>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[44px]"
            aria-label="Sign out of Creator Studio"
          >
            <LogOut className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            <span className="hidden lg:block">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b flex items-center gap-2 px-4 py-3">
        <Compass className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
        <p className="font-semibold text-sm flex-1">Creator Studio</p>
        <nav className="flex items-center gap-1" aria-label="Creator navigation">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main */}
      <main className="flex-1 overflow-y-auto pt-[57px] md:pt-0">
        {children}
      </main>
    </div>
  );
}
