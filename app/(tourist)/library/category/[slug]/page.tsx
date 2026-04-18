import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ListingCard } from '@/components/listing/ListingCard';
import { LISTING_CATEGORIES } from '@/lib/constants';
import { searchListings, countListings } from '@/lib/local-listings';
import type { Listing, ListingCategory } from '@/types/database';

// Weekly ISR
export const revalidate = 604800;

// Scraped type strings that map to each DB category
const CATEGORY_TYPE_MAP: Record<string, string[]> = {
  beaches:     ['tours', 'experience', 'agencia'],
  mountains:   ['tours', 'experience'],
  cities:      ['hotel', 'posada', 'hospedaje', 'alojamiento'],
  'eco-tours': ['tours', 'experience'],
  gastronomy:  ['restaurante', 'restaurant', 'cafe', 'bar'],
  adventure:   ['tours', 'experience', 'agencia'],
  wellness:    ['spa', 'wellness', 'posada'],
  cultural:    ['tours', 'experience', 'agencia'],
};

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return LISTING_CATEGORIES.map((c) => ({ slug: c.value }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = LISTING_CATEGORIES.find((c) => c.value === slug);
  if (!cat) return { title: 'Category Not Found' };
  return {
    title: `${cat.label} in Venezuela | VZ Explorer`,
    description: `${cat.description}. Browse the best ${cat.label.toLowerCase()} experiences across Venezuela.`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = LISTING_CATEGORIES.find((c) => c.value === slug);
  if (!category) notFound();

  // Try Supabase first
  let listings: Listing[] | null = null;
  try {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase
        .from('listings')
        .select('*, provider:providers(business_name, is_verified)')
        .eq('is_published', true)
        .eq('category', slug as ListingCategory)
        .order('rating', { ascending: false });
      if (data && data.length > 0) listings = data as Listing[];
    }
  } catch {
    // Supabase not configured
  }

  // Scraped fallback — search by type strings that match this category
  if (!listings) {
    const types = CATEGORY_TYPE_MAP[slug] ?? ['tours', 'experience'];
    const scraped = types.flatMap((type) =>
      searchListings('', { type, limit: 50 })
    );
    // Deduplicate by id
    const seen = new Set<string>();
    const unique = scraped.filter((l) => {
      if (seen.has(l.id)) return false;
      seen.add(l.id);
      return true;
    });
    listings = unique as unknown as Listing[];
  }

  const count = listings?.length ?? 0;

  return (
    <div className="container px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-1.5">
        <Link href="/library" className="hover:text-foreground transition-colors">Explore</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{category.label}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">{category.icon}</span>
          <h1 className="text-3xl font-bold">{category.label}</h1>
        </div>
        <p className="text-muted-foreground text-lg max-w-2xl">{category.description}</p>
        <p className="text-sm text-muted-foreground mt-2">
          {count.toLocaleString()} {count === 1 ? 'experience' : 'experiences'} found
        </p>
      </div>

      {listings && listings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <span className="text-4xl">{category.icon}</span>
          <h3 className="font-semibold text-lg mt-4">No {category.label.toLowerCase()} experiences yet</h3>
          <p className="text-muted-foreground mt-1">Check back soon — we&apos;re adding new listings every week.</p>
        </div>
      )}
    </div>
  );
}
