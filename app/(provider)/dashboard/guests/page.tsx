import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatDate, getInitials } from '@/lib/utils';

export const metadata: Metadata = { title: 'Guests' };

export default async function GuestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: provider } = await supabase.from('providers').select('id').eq('user_id', user.id).single();
  const { data: listings } = await supabase.from('listings').select('id, title').eq('provider_id', provider?.id || '');
  const listingIds = listings?.map((l) => l.id) || [];

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, listing:listings(title), tourist:users(id, full_name, email, avatar_url, nationality, created_at)')
    .in('listing_id', listingIds)
    .in('status', ['confirmed', 'completed'])
    .order('created_at', { ascending: false });

  // Deduplicate by tourist id
  const guestMap = new Map<string, { tourist: NonNullable<typeof bookings>[0]['tourist'], visits: number, lastVisit: string }>();
  bookings?.forEach((b) => {
    if (!b.tourist) return;
    const existing = guestMap.get(b.tourist.id);
    if (existing) {
      existing.visits++;
      if (b.created_at > existing.lastVisit) existing.lastVisit = b.created_at;
    } else {
      guestMap.set(b.tourist.id, { tourist: b.tourist, visits: 1, lastVisit: b.created_at });
    }
  });

  const guests = Array.from(guestMap.values()).sort((a, b) => b.visits - a.visits);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Guests</h1>
        <p className="text-muted-foreground text-sm">{guests.length} unique guests</p>
      </div>

      {guests.length > 0 ? (
        <div className="grid gap-3">
          {guests.map(({ tourist, visits, lastVisit }) => (
            <Card key={tourist?.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12 flex-shrink-0">
                    <AvatarImage src={tourist?.avatar_url || undefined} />
                    <AvatarFallback>{getInitials(tourist?.full_name || 'G')}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{tourist?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{tourist?.email}</p>
                    {tourist?.nationality && (
                      <p className="text-xs text-muted-foreground">From {tourist.nationality}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge variant="secondary">{visits} visit{visits !== 1 ? 's' : ''}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">Last: {formatDate(lastVisit)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">No guests yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
