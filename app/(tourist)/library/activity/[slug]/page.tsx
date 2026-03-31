import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ListingCard } from '@/components/listing/ListingCard';
import type { Listing } from '@/types/database';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug.replace(/-/g, ' ')} experiences in Venezuela`,
  };
}

export default async function ActivityPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: listings } = await supabase
    .from('listings')
    .select('*, provider:providers(business_name, is_verified)')
    .eq('is_published', true)
    .contains('tags', [slug])
    .order('rating', { ascending: false });

  const title = slug.replace(/-/g, ' ');

  return (
    <div className="container px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold capitalize">{title} experiences</h1>
        <p className="text-muted-foreground mt-1">
          {listings?.length || 0} experiences found
        </p>
      </div>

      {listings && listings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing as Listing} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <h3 className="font-semibold text-lg">No {title} experiences found</h3>
        </div>
      )}
    </div>
  );
}
