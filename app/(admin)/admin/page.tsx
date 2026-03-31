import type { Metadata } from 'next';
import { Users, ListChecks, DollarSign, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Admin Overview' };

export default async function AdminPage() {
  const supabase = await createClient();

  const [
    { count: usersCount },
    { count: providersCount },
    { count: listingsCount },
    { data: recentBookings },
    { data: recentProviders },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('providers').select('*', { count: 'exact', head: true }),
    supabase.from('listings').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*, listing:listings(title), tourist:users(full_name)').order('created_at', { ascending: false }).limit(5),
    supabase.from('providers').select('*, user:users(full_name, email)').order('created_at', { ascending: false }).limit(5),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Overview</h1>
        <p className="text-muted-foreground text-sm">Venezuela Tourism SuperApp — admin dashboard</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{usersCount || 0}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500 opacity-60" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Providers</p>
              <p className="text-2xl font-bold">{providersCount || 0}</p>
            </div>
            <Star className="w-8 h-8 text-yellow-500 opacity-60" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Listings</p>
              <p className="text-2xl font-bold">{listingsCount || 0}</p>
            </div>
            <ListChecks className="w-8 h-8 text-green-500 opacity-60" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold">—</p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-500 opacity-60" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Bookings</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentBookings?.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{b.listing?.title}</p>
                    <p className="text-xs text-muted-foreground">{b.tourist?.full_name}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="text-xs">{b.status}</Badge>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(b.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Providers</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentProviders?.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{p.business_name}</p>
                    <p className="text-xs text-muted-foreground">{p.user?.email}</p>
                  </div>
                  <Badge variant={p.is_verified ? 'default' : 'secondary'} className="text-xs">
                    {p.is_verified ? 'Verified' : 'Pending'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
