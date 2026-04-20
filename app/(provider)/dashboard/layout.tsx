import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProviderSidebar } from '@/components/provider/ProviderSidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Dev-only: skip auth checks when DEV_SKIP_AUTH is set in .env.local
  const skipAuth = process.env.DEV_SKIP_AUTH === 'true';

  if (!skipAuth) {
    const supabase = await createClient();
    if (!supabase) redirect('/login?redirectTo=/dashboard');

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login?redirectTo=/dashboard');

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();

    if (!profile || (profile.role !== 'provider' && profile.role !== 'admin')) {
      redirect('/');
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-muted/10">
      <ProviderSidebar />
      <main id="main" role="main" className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="p-4 md:p-6 max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
