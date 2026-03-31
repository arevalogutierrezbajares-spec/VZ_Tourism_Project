import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ListingCard } from '@/components/listing/ListingCard';
import { LISTING_CATEGORIES } from '@/lib/constants';
import type { Listing, ListingCategory } from '@/types/database';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = LISTING_CATEGORIES.find((c) => c.value === slug);
  if (!cat) return { title: 'Category Not Found' };
  return { title: `${cat.label} in Venezuela`, description: cat.description };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = LISTING_CATEGORIES.find((c) => c.value === slug);
  if (!category) notFound();

  const supabase = await createClient();
  const { data: listings } = await supabase
    .from('listings')
    .select('*, provider:providers(business_name, is_verified)')
    .eq('is_published', true)
    .eq('category', slug as ListingCategory)
    .order('rating', { ascending: false });

  return (
    <div className="container px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">{category.icon}</span>
          <h1 className="text-3xl font-bold">{category.label}</h1>
        </div>
        <p className="text-muted-foreground">{category.description}</p>
        <p className="text-sm text-muted-foreground mt-1">
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
          <span className="text-4xl">{category.icon}</span>
          <h3 className="font-semibold text-lg mt-4">No {category.label.toLowerCase()} experiences yet</h3>
          <p className="text-muted-foreground mt-1">Check back soon for new listings!</p>
        </div>
      )}
    </div>
  );
}
