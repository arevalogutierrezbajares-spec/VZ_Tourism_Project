import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ListingCard } from '@/components/listing/ListingCard';
import { SafetyBadge } from '@/components/common/SafetyBadge';
import { VENEZUELA_REGIONS } from '@/lib/constants';
import { getListingsByRegion } from '@/lib/local-listings';
import type { Listing } from '@/types/database';

// Weekly ISR — regenerates every 7 days
export const revalidate = 604800;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return VENEZUELA_REGIONS.map((r) => ({ slug: r.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const region = VENEZUELA_REGIONS.find((r) => r.id === slug);
  if (!region) return { title: 'Region Not Found' };
  return {
    title: `Explore ${region.name}, Venezuela | VZ Explorer`,
    description: `${region.description}. Browse hotels, restaurants, and experiences in ${region.name}.`,
  };
}

export default async function RegionPage({ params }: Props) {
  const { slug } = await params;
  const region = VENEZUELA_REGIONS.find((r) => r.id === slug);
  if (!region) notFound();

  // Try Supabase first (verified/onboarded listings)
  let listings: Listing[] | null = null;
  try {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase
        .from('listings')
        .select('*, provider:providers(business_name, is_verified)')
        .eq('is_published', true)
        .eq('region', region.name)
        .order('rating', { ascending: false });
      if (data && data.length > 0) listings = data as Listing[];
    }
  } catch {
    // Supabase not configured
  }

  // Scraped listings fallback — all 1,170 places from local JSON
  const scraped = getListingsByRegion(region.name.toLowerCase()) as unknown as Listing[];
  const displayListings = listings ?? scraped;
  const count = displayListings.length;

  return (
    <div className="container px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-1.5">
        <Link href="/library" className="hover:text-foreground transition-colors">Explore</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{region.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-8 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold">{region.name}</h1>
          <SafetyBadge level={region.safetyLevel} />
        </div>
        <p className="text-muted-foreground text-lg max-w-2xl">{region.description}</p>
        <div className="flex flex-wrap gap-2">
          {region.highlights.map((h) => (
            <span key={h} className="px-3 py-1 bg-muted rounded-full text-sm font-medium">{h}</span>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {count.toLocaleString()} {count === 1 ? 'place' : 'places'} in {region.name}
        </p>
      </div>

      {/* Grid */}
      {displayListings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">🌄</p>
          <h3 className="font-semibold text-lg">No listings in {region.name} yet</h3>
          <p className="text-muted-foreground mt-1">Check back soon — we&apos;re adding new places every week.</p>
        </div>
      )}
    </div>
  );
}
