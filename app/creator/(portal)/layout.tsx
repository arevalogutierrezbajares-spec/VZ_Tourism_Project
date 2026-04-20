'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Compass, LayoutDashboard, PlusCircle, Tag, BarChart2, ChevronRight, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';

const navItems = [
  { href: '/creator/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/creator/itineraries/new', label: 'New Itinerary', icon: PlusCircle },
  { href: '/creator/codes', label: 'Discount Codes', icon: Tag },
  { href: '/creator/analytics', label: 'Analytics', icon: BarChart2 },
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
      router.replace('/login?next=' + encodeURIComponent(pathname));
      return;
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        const zustandUser = useAuthStore.getState().user;
        if (zustandUser) { setChecking(false); return; }
        router.replace('/login?next=' + encodeURIComponent(pathname));
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
      {/* Sidebar */}
      <aside className="flex flex-col flex-shrink-0 w-56 bg-card border-r">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b">
          <Compass className="w-5 h-5 text-primary" />
          <div>
            <p className="font-semibold text-sm">Creator Studio</p>
            <p className="text-[11px] text-muted-foreground leading-none mt-0.5">VZ Explorer</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight className="w-3 h-3 opacity-60" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t space-y-0.5">
          <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors min-h-[44px]">
            ← Back to app
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors min-h-[44px]"
            aria-label="Sign out of Creator Studio"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
