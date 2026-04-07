import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getInitials, formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'My Profile' };

export default async function ProfilePage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  if (!supabase || !user) {
    return (
      <div className="container px-4 py-16 max-w-md mx-auto text-center">
        <p className="text-lg font-medium mb-2">Sign in to view your profile</p>
        <p className="text-sm text-muted-foreground mb-6">
          Your profile, bookings, and travel history are available after signing in.
        </p>
        <a href="/login" className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity">
          Sign in
        </a>
      </div>
    );
  }

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, listing:listings(title, cover_image_url, slug)')
    .eq('tourist_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div className="container px-4 py-8 max-w-4xl mx-auto">
      {/* Profile header */}
      <div className="flex items-start gap-5 mb-8">
        <Avatar className="w-20 h-20 shadow-md">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
            {getInitials(profile?.full_name || 'U')}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{profile?.full_name}</h1>
            <Badge variant="secondary" className="capitalize">{profile?.role}</Badge>
          </div>
          <p className="text-muted-foreground mt-0.5">{profile?.email}</p>
          {profile?.nationality && (
            <p className="text-sm text-muted-foreground">From {profile.nationality}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Member since {profile?.created_at ? formatDate(profile.created_at) : '-'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{bookings?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Trips booked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {bookings?.filter((b) => b.status === 'completed').length || 0}
            </p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Reviews written</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings && bookings.length > 0 ? (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">{booking.listing?.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(booking.check_in)}</p>
                  </div>
                  <Badge className={booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : ''}>
                    {booking.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              No bookings yet.{' '}
              <a href="/library" className="text-primary hover:underline">
                Explore experiences
              </a>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
