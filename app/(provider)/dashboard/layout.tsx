import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProviderSidebar } from '@/components/provider/ProviderSidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?redirectTo=/dashboard');

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();

  if (!profile || (profile.role !== 'provider' && profile.role !== 'admin')) {
    redirect('/');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-muted/10">
      <ProviderSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
