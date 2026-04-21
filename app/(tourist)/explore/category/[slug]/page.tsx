import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, ArrowRight, Sparkles } from 'lucide-react';
import { ListingCard } from '@/components/listing/ListingCard';
import { LISTING_CATEGORIES } from '@/lib/constants';
import { CATEGORY_CONTENT } from '@/lib/editorial-content';
import { searchListings } from '@/lib/local-listings';
import { scrapedToListing } from '@/lib/scraped-adapter';
import { createClient } from '@/lib/supabase/server';
import type { Listing, ListingCategory } from '@/types/database';

// Weekly ISR
export const revalidate = 604800;

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
  if (!cat) notFound();
  const content = CATEGORY_CONTENT[slug];
  return {
    title: `${cat.label} in Venezuela`,
    description: content?.tagline ?? cat.description,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = LISTING_CATEGORIES.find((c) => c.value === slug);
  if (!category) notFound();

  const content = CATEGORY_CONTENT[slug];

  // Load listings
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
  } catch {}

  if (!listings) {
    const types = CATEGORY_TYPE_MAP[slug] ?? ['tours', 'experience'];
    const scraped = types.flatMap((type) => searchListings('', { type, limit: 50 }));
    const seen = new Set<string>();
    listings = scraped
      .filter((l) => {
        if (seen.has(l.id)) return false;
        seen.add(l.id);
        return true;
      })
      .map(scrapedToListing);
  }

  const count = listings?.length ?? 0;

  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <section className="relative h-[380px] sm:h-[440px] overflow-hidden">
        {content?.heroImage && (
          <Image
            src={content.heroImage}
            alt={`${category.label} experiences in Venezuela`}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        {/* Breadcrumb */}
        <div className="absolute top-6 left-0 w-full px-6 sm:px-10">
          <nav className="text-sm text-white/60 flex items-center gap-1.5" aria-label="Breadcrumb">
            <Link href="/explore" className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded-sm">Explore</Link>
            <span aria-hidden="true">/</span>
            <span className="text-white/90" aria-current="page">{category.label}</span>
          </nav>
        </div>

        {/* Hero content — bottom left */}
        <div className="absolute bottom-0 left-0 w-full px-6 sm:px-10 pb-8 sm:pb-10">
          <span className="inline-block text-xs font-mono tracking-widest text-accent uppercase mb-3">
            <span aria-hidden="true">{category.icon} </span>{category.label}
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-heading text-white leading-tight max-w-2xl mb-2">
            {content?.headline ?? category.label}
          </h1>
          {content?.tagline && (
            <p className="text-white/70 text-base sm:text-lg max-w-xl">
              {content.tagline}
            </p>
          )}
          <p className="mt-3 text-sm text-white/50">
            {count.toLocaleString()} {count === 1 ? 'experience' : 'experiences'} available
          </p>
        </div>
      </section>

      {/* ── Main content ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-16">

        {/* ── Intro + Quick stats ── */}
        {content && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16">
            {/* Editorial intro */}
            <div className="lg:col-span-2 space-y-4">
              {content.intro.map((para, i) => (
                <p key={i} className={`leading-relaxed ${i === 0 ? 'text-lg text-foreground' : 'text-base text-muted-foreground'}`}>
                  {para}
                </p>
              ))}

              {/* Highlights */}
              <ul className="mt-6 space-y-2">
                {content.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick stats card */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl border bg-muted/30 p-6 space-y-4 sticky top-24">
                <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase">At a glance</p>
                {content.quickStats.map((stat, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                    <span className="text-sm font-semibold">{stat.value}</span>
                  </div>
                ))}

                {/* AI CTA */}
                <Link
                  href="/map?mode=ai"
                  className="mt-2 flex items-center gap-2 w-full px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Plan with AI
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── Guides & Articles ── */}
        {content?.guides && content.guides.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Guides & stories</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {content.guides.map((guide, i) => (
                <Link
                  key={i}
                  href={(guide as unknown as Record<string, string>).slug
                    ? `/explore/guide/${(guide as unknown as Record<string, string>).slug}`
                    : `/library?q=${encodeURIComponent(guide.title)}`}
                  className="group block rounded-2xl border overflow-hidden hover:shadow-md transition-shadow duration-300 bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <article>
                    {/* Cover image */}
                    <div className="relative h-44 overflow-hidden">
                      <Image
                        src={guide.image}
                        alt={guide.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <span className="absolute bottom-3 left-3 text-xs px-2.5 py-1 rounded-full bg-background/90 text-foreground font-medium">
                        {guide.tag}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {guide.readTime}
                      </div>
                      <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors">
                        {guide.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {guide.teaser}
                      </p>
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                          Read guide <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Listings ── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">
                {category.label} experiences
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {count.toLocaleString()} {count === 1 ? 'listing' : 'listings'} available to book
              </p>
            </div>
          </div>

          {listings && listings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {listings.slice(0, 24).map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center rounded-2xl border border-dashed">
              <span className="text-4xl" aria-hidden="true">{category.icon}</span>
              <h3 className="font-semibold text-base mt-4">No listings yet for {category.label}</h3>
              <p className="text-sm text-muted-foreground mt-1">We add new experiences every week — check back soon.</p>
              <Link
                href="/map?mode=ai"
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Sparkles className="w-4 h-4" />
                Ask the AI for ideas
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
