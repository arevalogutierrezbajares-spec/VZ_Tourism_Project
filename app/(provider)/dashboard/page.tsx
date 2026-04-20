import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { DollarSign, Calendar, Star, TrendingUp, Plus, Eye, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Provider Dashboard' };

export default async function ProviderDashboardPage() {
  const supabase = await createClient();
  if (!supabase) redirect('/login');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: provider } = await supabase
    .from('providers')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, slug, price_usd, rating, review_count, is_published, cover_image_url')
    .eq('provider_id', provider?.id || '')
    .order('created_at', { ascending: false })
    .limit(5);

  const listingIds = listings?.map((l) => l.id) || [];

  const { data: recentBookings } = listingIds.length > 0
    ? await supabase
        .from('bookings')
        .select('*, listing:listings(title, slug), tourist:users(full_name, avatar_url)')
        .in('listing_id', listingIds)
        .order('created_at', { ascending: false })
        .limit(10)
    : { data: [] };

  const { data: allBookings } = listingIds.length > 0
    ? await supabase
        .from('bookings')
        .select('total_usd, status')
        .in('listing_id', listingIds)
    : { data: [] };

  const totalRevenue = allBookings?.filter((b) => b.status === 'completed').reduce((sum, b) => sum + (b.total_usd || 0), 0) || 0;
  const pendingBookings = allBookings?.filter((b) => b.status === 'pending').length || 0;
  const confirmedBookings = allBookings?.filter((b) => b.status === 'confirmed').length || 0;
  const avgRating = listings?.length
    ? listings.reduce((sum, l) => sum + (l.rating || 0), 0) / listings.length
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {provider?.business_name || 'Provider'}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Here's what's happening with your business</p>
        </div>
        <Link href="/dashboard/listings/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Listing
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Bookings</p>
                <p className="text-2xl font-bold mt-1">{pendingBookings}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Bookings</p>
                <p className="text-2xl font-bold mt-1">{confirmedBookings}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Rating</p>
                <p className="text-2xl font-bold mt-1">{avgRating.toFixed(1)}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Star className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Bookings</CardTitle>
            <Link href="/dashboard/bookings" className="text-xs text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {recentBookings && recentBookings.length > 0 ? (
              <div className="space-y-3">
                {recentBookings.slice(0, 5).map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{booking.listing?.title}</p>
                      <p className="text-xs text-muted-foreground">{booking.tourist?.full_name} · {formatDate(booking.check_in)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(booking.total_usd)}</p>
                      <Badge
                        variant="secondary"
                        className={
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-800 text-xs' :
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800 text-xs' :
                          'text-xs'
                        }
                      >
                        {booking.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No bookings yet</p>
            )}
          </CardContent>
        </Card>

        {/* My Listings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">My Listings</CardTitle>
            <Link href="/dashboard/listings" className="text-xs text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {listings && listings.length > 0 ? (
              <div className="space-y-3">
                {listings.map((listing) => (
                  <div key={listing.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                    {listing.cover_image_url ? (
                      <img src={listing.cover_image_url} alt={listing.title} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-muted flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{listing.title}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(listing.price_usd)} · ★ {listing.rating?.toFixed(1) || 'New'}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={listing.is_published ? 'default' : 'secondary'} className="text-xs">
                        {listing.is_published ? 'Live' : 'Draft'}
                      </Badge>
                      <Link href={`/dashboard/listings/${listing.id}/edit`}>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-3">No listings yet</p>
                <Link href="/dashboard/listings/new">
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Create your first listing
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'New Listing', href: '/dashboard/listings/new', icon: Plus },
              { label: 'View Bookings', href: '/dashboard/bookings', icon: Calendar },
              { label: 'Analytics', href: '/dashboard/analytics', icon: TrendingUp },
              { label: 'Settings', href: '/dashboard/settings', icon: Users },
            ].map(({ label, href, icon: Icon }) => (
              <Link key={href} href={href}>
                <Button variant="outline" className="w-full h-16 flex-col gap-2">
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
