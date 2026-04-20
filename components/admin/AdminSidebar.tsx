'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, ListChecks, Compass, Users, BarChart3, Cpu,
  Settings, Zap, ChevronRight, GitPullRequest, CalendarCheck,
  Send, Route, Menu, X,
} from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/listings', label: 'Listings', icon: ListChecks },
  { href: '/admin/discover', label: 'Discover Feed', icon: Compass },
  { href: '/admin/providers', label: 'Providers', icon: GitPullRequest },
  { href: '/admin/outreach', label: 'Outreach', icon: Send },
  { href: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
  { href: '/admin/itineraries', label: 'Itineraries', icon: Route },
  { href: '/admin/creators', label: 'Creators', icon: Users },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/scraper', label: 'Scraper', icon: Cpu },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Close sidebar on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && sidebarOpen) setSidebarOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/10">
        <div
          className="flex items-center justify-center rounded-lg"
          style={{ width: 32, height: 32, background: '#3B82F6' }}
        >
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="font-bold text-white text-sm tracking-tight">VZ Admin</span>
          <p className="text-[10px] text-white/40 leading-none mt-0.5">Tourism Platform</p>
        </div>
        {/* Mobile close button */}
        <button
          className="ml-auto md:hidden p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto" aria-label="Admin navigation">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group focus:outline-none focus:ring-2 focus:ring-blue-400"
              style={{
                background: active ? '#3B82F6' : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,0.55)',
              }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-60" aria-hidden="true" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/10">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          ← Back to app
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed top-3 left-3 z-50 md:hidden p-2 rounded-lg bg-gray-800 text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar menu"
        aria-expanded={sidebarOpen}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — desktop: always visible, mobile: slide-in overlay */}
      <aside
        ref={sidebarRef}
        className={`
          flex flex-col flex-shrink-0 z-40
          fixed inset-y-0 left-0 md:relative
          transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{ width: 250, background: '#1F2937' }}
        role="navigation"
        aria-label="Admin sidebar"
      >
        {sidebarContent}
      </aside>
    </>
  );
}
