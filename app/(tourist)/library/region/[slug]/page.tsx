import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, ArrowRight } from 'lucide-react';
import { ListingCard } from '@/components/listing/ListingCard';
import { SafetyBadge } from '@/components/common/SafetyBadge';
import { DestinationCTA } from '@/components/library/DestinationCTA';
import { VENEZUELA_REGIONS } from '@/lib/constants';
import { DESTINATION_CONTENT } from '@/lib/editorial-content';
import { getListingsByRegion } from '@/lib/local-listings';
import { scrapedToListing } from '@/lib/scraped-adapter';
import { createClient } from '@/lib/supabase/server';
import type { Listing } from '@/types/database';

// Weekly ISR
export const revalidate = 604800;

// Map tab value → scraped listing type strings
const TAB_TYPES: Record<string, string[]> = {
  stays:       ['hotel', 'posada', 'hospedaje', 'alojamiento', 'casa vacacional', 'hostal'],
  dining:      ['restaurante', 'restaurant', 'cafe', 'bar'],
  experiences: ['tours', 'tour', 'experience', 'agencia', 'transfer'],
};

const TABS = [
  { id: 'all',         label: 'All' },
  { id: 'stays',       label: 'Hotels & Stays' },
  { id: 'dining',      label: 'Dining' },
  { id: 'experiences', label: 'Activities' },
];

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export async function generateStaticParams() {
  return VENEZUELA_REGIONS.map((r) => ({ slug: r.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const region = VENEZUELA_REGIONS.find((r) => r.id === slug);
  if (!region) return { title: 'Destination Not Found' };
  const content = DESTINATION_CONTENT[slug];
  return {
    title: `${region.name}, Venezuela | VZ Explorer`,
    description: content?.tagline ?? region.description,
  };
}

export default async function RegionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { tab: rawTab } = await searchParams;
  const activeTab = TABS.find((t) => t.id === rawTab)?.id ?? 'all';

  const region = VENEZUELA_REGIONS.find((r) => r.id === slug);
  if (!region) notFound();

  const content = DESTINATION_CONTENT[slug];

  // Load listings
  let allListings: Listing[] | null = null;
  try {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase
        .from('listings')
        .select('*, provider:providers(business_name, is_verified)')
        .eq('is_published', true)
        .eq('region', region.name)
        .order('rating', { ascending: false });
      if (data && data.length > 0) allListings = data as Listing[];
    }
  } catch {}

  // Scraped fallback — filter by tab type before converting to Listing shape
  let displayListings: Listing[];
  if (!allListings) {
    const scraped = getListingsByRegion(region.name.toLowerCase());
    const filtered =
      activeTab === 'all'
        ? scraped
        : scraped.filter((s) => {
            const type = (s.type ?? '').toLowerCase();
            return TAB_TYPES[activeTab]?.some((t) => type.includes(t));
          });
    allListings = scraped.map(scrapedToListing);
    displayListings = filtered.map(scrapedToListing);
  } else {
    // Supabase listings: filter by category field
    displayListings =
      activeTab === 'all'
        ? allListings
        : allListings.filter((l) => {
            const type = (l.category ?? '').toLowerCase();
            return TAB_TYPES[activeTab]?.some((t) => type.includes(t));
          });
  }

  const count = allListings.length;
  const tabCount = displayListings.length;
  const base = `/library/region/${slug}`;

  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <section className="relative h-[420px] sm:h-[500px] overflow-hidden">
        {content?.heroImage && (
          <img
            src={content.heroImage}
            alt={region.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />

        {/* Breadcrumb */}
        <div className="absolute top-6 left-0 w-full px-6 sm:px-10">
          <nav className="text-sm text-white/60 flex items-center gap-1.5">
            <Link href="/library" className="hover:text-white transition-colors">Explore</Link>
            <span>/</span>
            <Link href="/library" className="hover:text-white transition-colors">Destinations</Link>
            <span>/</span>
            <span className="text-white/90">{region.name}</span>
          </nav>
        </div>

        {/* Bottom row: name + safety on left, count on right */}
        <div className="absolute bottom-0 left-0 w-full px-6 sm:px-10 pb-8 sm:pb-10 flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight">
                {content?.headline ?? region.name}
              </h1>
              <SafetyBadge level={region.safetyLevel} />
            </div>
            {content?.tagline && (
              <p className="text-white/70 text-base sm:text-lg max-w-xl">{content.tagline}</p>
            )}
          </div>
          <div className="hidden sm:block text-right flex-shrink-0">
            <p className="text-2xl font-bold text-white">{count.toLocaleString()}</p>
            <p className="text-sm text-white/60">listings</p>
          </div>
        </div>
      </section>

      {/* ── Quick facts bar ── */}
      {content?.quickFacts && (
        <div className="bg-muted/50 border-b">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {content.quickFacts.map((fact, i) => (
                <div key={i} className="min-w-0">
                  <p className="text-xs font-mono tracking-wide text-muted-foreground uppercase truncate">
                    {fact.label}
                  </p>
                  <p className="text-sm font-semibold mt-0.5 leading-snug">{fact.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-16">

        {/* ── Intro + Highlights ── */}
        {content && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16">
            {/* Editorial paragraphs */}
            <div className="lg:col-span-2 space-y-4">
              {content.intro.map((para, i) => (
                <p key={i} className={`leading-relaxed ${i === 0 ? 'text-lg text-foreground' : 'text-base text-muted-foreground'}`}>
                  {para}
                </p>
              ))}
            </div>

            {/* Highlights */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl border bg-muted/30 p-6 space-y-1">
                <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase mb-4">Top highlights</p>
                {region.highlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 border-b last:border-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    <span className="text-sm">{h}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Top Activities ── */}
        {content?.topActivities && content.topActivities.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-5">Things to do in {region.name}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {content.topActivities.map((act, i) => (
                <div
                  key={i}
                  className="rounded-xl border bg-card p-4 flex flex-col items-center text-center gap-2 hover:shadow-sm transition-shadow"
                >
                  <span className="text-3xl">{act.icon}</span>
                  <p className="font-semibold text-sm leading-tight">{act.name}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{act.desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Guides ── */}
        {content?.guides && content.guides.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-5">Guides & stories</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {content.guides.map((guide, i) => (
                <article key={i} className="group rounded-2xl border overflow-hidden hover:shadow-md transition-shadow duration-300 bg-card flex flex-col sm:flex-row">
                  {/* Image */}
                  <div className="relative h-40 sm:h-auto sm:w-44 flex-shrink-0 overflow-hidden">
                    <img
                      src={guide.image}
                      alt={guide.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  {/* Text */}
                  <div className="p-4 flex flex-col justify-center gap-2">
                    <span className="text-xs font-medium text-primary">{guide.tag}</span>
                    <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors">
                      {guide.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {guide.teaser}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" /> {guide.readTime}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                        Read <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ── Tabbed Listings ── */}
        <section>
          {/* Tab nav — URL-based, no JS required */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <h2 className="text-xl font-bold">
              {activeTab === 'all' ? `All listings in ${region.name}` : `${TABS.find((t) => t.id === activeTab)?.label} in ${region.name}`}
            </h2>
            <p className="text-sm text-muted-foreground">{tabCount.toLocaleString()} {tabCount === 1 ? 'listing' : 'listings'}</p>
          </div>

          {/* Pills */}
          <div className="flex gap-2 flex-wrap mb-7">
            {TABS.map((t) => (
              <Link
                key={t.id}
                href={t.id === 'all' ? base : `${base}?tab=${t.id}`}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                  activeTab === t.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>

          {/* Grid */}
          {displayListings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {displayListings.slice(0, 24).map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center rounded-2xl border border-dashed">
              <p className="text-3xl mb-3">🌄</p>
              <h3 className="font-semibold text-base">
                No {TABS.find((t) => t.id === activeTab)?.label.toLowerCase()} listed yet in {region.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                We add new listings every week — check back soon.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* ── CTA Strip ── */}
      <DestinationCTA destinationName={region.name} />
    </div>
  );
}
