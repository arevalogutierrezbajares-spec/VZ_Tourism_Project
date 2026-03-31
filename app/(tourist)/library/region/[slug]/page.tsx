import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ListingCard } from '@/components/listing/ListingCard';
import { SafetyBadge } from '@/components/common/SafetyBadge';
import { VENEZUELA_REGIONS } from '@/lib/constants';
import type { Listing } from '@/types/database';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const region = VENEZUELA_REGIONS.find((r) => r.id === slug);
  if (!region) return { title: 'Region Not Found' };
  return { title: `Explore ${region.name}, Venezuela`, description: region.description };
}

export default async function RegionPage({ params }: Props) {
  const { slug } = await params;
  const region = VENEZUELA_REGIONS.find((r) => r.id === slug);
  if (!region) notFound();

  const supabase = await createClient();
  const { data: listings } = await supabase
    .from('listings')
    .select('*, provider:providers(business_name, is_verified)')
    .eq('is_published', true)
    .eq('region', region.name)
    .order('rating', { ascending: false });

  return (
    <div className="container px-4 py-8">
      <div className="mb-8 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold">{region.name}</h1>
          <SafetyBadge level={region.safetyLevel} />
        </div>
        <p className="text-muted-foreground text-lg">{region.description}</p>
        <div className="flex flex-wrap gap-2">
          {region.highlights.map((h) => (
            <span key={h} className="px-3 py-1 bg-muted rounded-full text-sm">{h}</span>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {listings?.length || 0} experiences in {region.name}
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
          <p className="text-4xl mb-4">🌄</p>
          <h3 className="font-semibold text-lg">No experiences in {region.name} yet</h3>
          <p className="text-muted-foreground mt-1">Be the first provider to list an experience here!</p>
        </div>
      )}
    </div>
  );
}
