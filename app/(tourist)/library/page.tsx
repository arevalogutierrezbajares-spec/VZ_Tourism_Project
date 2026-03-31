import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ListingCard } from '@/components/listing/ListingCard';
import { LISTING_CATEGORIES, VENEZUELA_REGIONS } from '@/lib/constants';
import type { Listing } from '@/types/database';

export const metadata: Metadata = {
  title: 'Discover Venezuela',
  description: 'Browse all tourism experiences across Venezuela',
};

export default async function LibraryPage() {
  const supabase = await createClient();

  const { data: featuredListings } = await supabase
    .from('listings')
    .select('*, provider:providers(business_name, is_verified, rating)')
    .eq('is_published', true)
    .eq('is_featured', true)
    .order('rating', { ascending: false })
    .limit(8);

  const { data: recentListings } = await supabase
    .from('listings')
    .select('*, provider:providers(business_name, is_verified)')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(12);

  return (
    <div className="container px-4 py-8 space-y-12">
      {/* Hero */}
      <div className="text-center space-y-3 py-6">
        <h1 className="text-4xl font-bold">Discover Venezuela</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          From pristine Caribbean beaches to Andean peaks — find your perfect Venezuelan adventure
        </p>
      </div>

      {/* Categories */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Browse by category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {LISTING_CATEGORIES.map((cat) => (
            <Link
              key={cat.value}
              href={`/library/category/${cat.value}`}
              className="group flex flex-col items-center p-6 rounded-2xl border bg-card hover:border-primary hover:shadow-md transition-all text-center"
            >
              <span className="text-3xl mb-2">{cat.icon}</span>
              <span className="font-semibold">{cat.label}</span>
              <span className="text-xs text-muted-foreground mt-1">{cat.description}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Regions */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Explore by destination</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {VENEZUELA_REGIONS.slice(0, 8).map((region) => (
            <Link
              key={region.id}
              href={`/library/region/${region.id}`}
              className="group flex flex-col p-4 rounded-2xl border bg-card hover:border-primary hover:shadow-md transition-all"
            >
              <span className="font-semibold">{region.name}</span>
              <span className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {region.description}
              </span>
              <div className="flex gap-1 mt-2 flex-wrap">
                {region.highlights.slice(0, 2).map((h) => (
                  <span key={h} className="text-xs bg-muted px-1.5 py-0.5 rounded">{h}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      {featuredListings && featuredListings.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Featured experiences</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {featuredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing as Listing} />
            ))}
          </div>
        </section>
      )}

      {/* Recent */}
      {recentListings && recentListings.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Recently added</h2>
            <Link href="/library/category" className="text-sm text-primary hover:underline">
              See all
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {recentListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing as Listing} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
