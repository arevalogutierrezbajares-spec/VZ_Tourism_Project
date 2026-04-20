import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatDate, getInitials } from '@/lib/utils';

export const metadata: Metadata = { title: 'Guests' };

export default async function GuestsPage() {
  const supabase = await createClient();
  if (!supabase) redirect('/login');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: provider } = await supabase.from('providers').select('id').eq('user_id', user.id).single();
  const { data: listings } = await supabase.from('listings').select('id, title').eq('provider_id', provider?.id || '');
  const listingIds = listings?.map((l) => l.id) || [];

  const { data: bookings } = await supabase
    .from('guest_bookings')
    .select('guest_name, guest_email, created_at')
    .in('listing_id', listingIds)
    .in('status', ['confirmed', 'completed'])
    .order('created_at', { ascending: false });

  // Deduplicate by guest_email
  const guestMap = new Map<string, { name: string; email: string; visits: number; lastVisit: string }>();
  bookings?.forEach((b) => {
    if (!b.guest_email) return;
    const existing = guestMap.get(b.guest_email);
    if (existing) {
      existing.visits++;
      if (b.created_at > existing.lastVisit) existing.lastVisit = b.created_at;
    } else {
      guestMap.set(b.guest_email, { name: b.guest_name, email: b.guest_email, visits: 1, lastVisit: b.created_at });
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
          {guests.map(({ name, email, visits, lastVisit }) => (
            <Card key={email}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12 flex-shrink-0">
                    <AvatarFallback>{getInitials(name || 'G')}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{name}</p>
                    <p className="text-sm text-muted-foreground">{email}</p>
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
            <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">No guests yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Guest profiles will appear here once tourists book your experiences.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
