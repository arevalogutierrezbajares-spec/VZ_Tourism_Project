import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s — VZ Admin' } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const skipAuth = process.env.DEV_SKIP_AUTH === 'true';

  if (!skipAuth) {
    const supabase = await createClient();
    if (!supabase) redirect('/login?redirectTo=/admin');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login?redirectTo=/admin');

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'admin') {
      redirect('/');
    }
  }
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F3F4F6' }}>
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto md:ml-0" id="main" role="main">
        {/* Spacer for mobile hamburger */}
        <div className="h-14 md:h-0" />
        {children}
      </main>
    </div>
  );
}
