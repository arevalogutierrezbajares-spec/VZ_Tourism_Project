import type { Metadata } from 'next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { AdminProviderActions } from '@/components/admin/AdminProviderActions';

export const metadata: Metadata = { title: 'Admin: Providers' };

export default async function AdminProvidersPage() {
  const supabase = await createClient();
  const { data: providers } = await supabase
    .from('providers')
    .select('*, user:users(full_name, email, avatar_url)')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Providers</h1>
        <p className="text-muted-foreground text-sm">{providers?.length || 0} registered providers</p>
      </div>

      <div className="space-y-3">
        {providers?.map((provider) => (
          <Card key={provider.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{provider.business_name}</h3>
                    <Badge variant={provider.is_verified ? 'default' : 'secondary'}>
                      {provider.is_verified ? 'Verified' : 'Unverified'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{provider.user?.email}</p>
                  {provider.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{provider.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Joined {formatDate(provider.created_at)}</p>
                </div>
                <AdminProviderActions providerId={provider.id} isVerified={provider.is_verified} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
