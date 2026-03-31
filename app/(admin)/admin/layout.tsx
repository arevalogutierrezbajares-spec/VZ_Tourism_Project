import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Shield, LayoutDashboard, Users, Map, BarChart, FileText, DollarSign, ListChecks } from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/providers', label: 'Providers', icon: Users },
  { href: '/admin/listings', label: 'Listings', icon: ListChecks },
  { href: '/admin/safety-zones', label: 'Safety Zones', icon: Map },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart },
  { href: '/admin/cms', label: 'CMS', icon: FileText },
  { href: '/admin/payouts', label: 'Payouts', icon: DollarSign },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirectTo=/admin');

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') redirect('/');

  return (
    <div className="flex h-screen overflow-hidden bg-muted/10">
      <aside className="w-56 bg-card border-r flex flex-col flex-shrink-0">
        <div className="p-4 border-b flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-bold text-sm">Admin Panel</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t">
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">← Back to app</Link>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
