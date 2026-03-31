import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Admin: Listings' };

export default async function AdminListingsPage() {
  const supabase = await createClient();
  const { data: listings } = await supabase
    .from('listings')
    .select('*, provider:providers(business_name)')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">All Listings</h1>
        <p className="text-muted-foreground text-sm">{listings?.length || 0} listings on platform</p>
      </div>

      <div className="space-y-3">
        {listings?.map((listing) => (
          <Card key={listing.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {listing.cover_image_url ? (
                  <img src={listing.cover_image_url} alt={listing.title} className="w-16 h-14 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-14 rounded-lg bg-muted flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">{listing.title}</h3>
                    <Badge variant={listing.is_published ? 'default' : 'secondary'} className="text-xs">
                      {listing.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{listing.provider?.business_name} · {listing.category} · {listing.location_city}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{formatCurrency(listing.price_usd)}</span>
                    <span>★ {listing.rating?.toFixed(1) || 'New'}</span>
                    <span>{formatDate(listing.created_at)}</span>
                  </div>
                </div>
                <Link href={`/listing/${listing.slug}`} target="_blank">
                  <Button size="sm" variant="outline" className="text-xs flex-shrink-0">View</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
