import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = { title: 'My Listings' };

export default async function ListingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: provider } = await supabase.from('providers').select('id').eq('user_id', user.id).single();

  const { data: listings } = await supabase
    .from('listings')
    .select('*, _count:bookings(count)')
    .eq('provider_id', provider?.id || '')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Listings</h1>
          <p className="text-muted-foreground text-sm">{listings?.length || 0} listings total</p>
        </div>
        <Link href="/dashboard/listings/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Listing
          </Button>
        </Link>
      </div>

      {listings && listings.length > 0 ? (
        <div className="grid gap-4">
          {listings.map((listing) => (
            <Card key={listing.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {listing.cover_image_url ? (
                    <img
                      src={listing.cover_image_url}
                      alt={listing.title}
                      className="w-20 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-16 rounded-lg bg-muted flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold truncate">{listing.title}</h3>
                        <p className="text-sm text-muted-foreground capitalize">{listing.category} · {listing.location_city}</p>
                      </div>
                      <Badge variant={listing.is_published ? 'default' : 'secondary'}>
                        {listing.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{formatCurrency(listing.price_usd)}</span>
                      <span>★ {listing.rating?.toFixed(1) || 'New'} ({listing.review_count || 0} reviews)</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Link href={`/listing/${listing.slug}`} target="_blank">
                      <Button size="sm" variant="outline">View</Button>
                    </Link>
                    <Link href={`/dashboard/listings/${listing.id}/edit`}>
                      <Button size="sm" variant="outline">Edit</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground mb-4">You haven't created any listings yet.</p>
            <Link href="/dashboard/listings/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create your first listing
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
