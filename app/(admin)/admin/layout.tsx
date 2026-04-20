'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef, FormEvent } from 'react';
import {
  LayoutDashboard,
  ListChecks,
  Compass,
  Users,
  BarChart3,
  Cpu,
  Settings,
  Zap,
  ChevronRight,
  GitPullRequest,
  CalendarCheck,
  Send,
  Lock,
  Route,
  Menu,
  X,
} from 'lucide-react';

// Hash is validated server-side via ADMIN_PASSWORD env var.
// Client hashes the password and sends it as a cookie; the API layer
// compares against the server-side value. This constant is ONLY used
// for the initial client-side gate UX — it is NOT a secret.
const ADMIN_HASH = '1967e7168eb580368fcc78611a7ae30b7cb2b2938f1e2d2c865c48c719f69792';
const COOKIE_NAME = 'admin_token';

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, hours: number) {
  const expires = new Date(Date.now() + hours * 3600 * 1000).toUTCString();
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secure}`;
}

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

function LoginGate({ onAuth }: { onAuth: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const hash = await sha256(password);
    if (hash === ADMIN_HASH) {
      setCookie(COOKIE_NAME, hash, 8);
      onAuth();
    } else {
      setError('Incorrect password');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F3F4F6' }}>
      <div className="w-full max-w-sm px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="flex items-center justify-center rounded-lg" style={{ width: 36, height: 36, background: '#1F2937' }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">VZ Admin</p>
              <p className="text-xs text-gray-400">Tourism Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-gray-500" />
            <h1 className="text-lg font-semibold text-gray-900">Admin access</h1>
          </div>
          <p className="text-sm text-gray-500 mb-6">Enter the admin password to continue.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                autoFocus
                autoComplete="current-password"
                required
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>
            {error && (
              <p id="login-error" role="alert" className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-2.5 px-4 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Checking…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [authed, setAuthed] = useState<boolean | null>(null); // null = checking
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const token = getCookie(COOKIE_NAME);
    setAuthed(token === ADMIN_HASH);
  }, []);

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

  // Still reading cookie on first render
  if (authed === null) return null;

  // Not authenticated — show inline password gate
  if (!authed) {
    return <LoginGate onAuth={() => setAuthed(true)} />;
  }

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
    <div className="flex h-screen overflow-hidden" style={{ background: '#F3F4F6' }}>
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

      {/* Main */}
      <main className="flex-1 overflow-y-auto md:ml-0" role="main">
        {/* Spacer for mobile hamburger */}
        <div className="h-14 md:h-0" />
        {children}
      </main>
    </div>
  );
}
