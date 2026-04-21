import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getListingBySlug } from '@/lib/local-listings';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = getListingBySlug(slug);
  if (!listing) notFound();
  return {
    title: `${listing.name} — Join VZ Tourism`,
    description: `${listing.name} has been listed on VZ Tourism. Join as a platform partner to receive direct bookings.`,
  };
}

export default async function InvitePage({ params }: Props) {
  const { slug } = await params;
  const listing = getListingBySlug(slug);
  if (!listing) notFound();

  const benefits = [
    { icon: '📅', title: 'Direct bookings', desc: 'Receive reservations directly through the platform — no commissions to third-party OTAs.' },
    { icon: '📍', title: 'Verified map pin', desc: 'Get a checkmark on the map so travelers can identify you as a trusted partner.' },
    { icon: '💬', title: 'Direct messaging', desc: 'Communicate with guests before they arrive to answer questions and confirm details.' },
    { icon: '🌟', title: 'Reviews & reputation', desc: 'Build your online reputation with verified post-stay reviews from real guests.' },
    { icon: '🏆', title: 'Founding Partner status', desc: 'The first 50 businesses to join get permanent Founding Partner badge and priority placement.' },
    { icon: '📊', title: 'Analytics dashboard', desc: 'Track views, inquiries, and bookings to understand your performance.' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-primary/20">
            <span aria-hidden="true">🇻🇪</span> VZ Tourism Platform
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-balance">
            {listing.name}, join us as a platform partner
          </h1>
          <p className="text-lg text-muted-foreground text-pretty">
            Your business is already listed on VZ Tourism. Thousands of travelers discover it every month.
            Join the platform to start receiving direct bookings.
          </p>
        </div>

        {/* Current listing card */}
        <div className="bg-card rounded-2xl shadow-sm border p-5 mb-8 flex items-center gap-4">
          {listing.cover_image_url && (
            <img
              src={listing.cover_image_url}
              alt={`Photo of ${listing.name}`}
              className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">{listing.name}</p>
            <p className="text-sm text-muted-foreground capitalize">{listing.type} · {listing.region}</p>
            {listing.avg_rating && (
              <p className="text-sm text-accent font-medium mt-0.5 tabular-nums">
                ★ {listing.avg_rating.toFixed(1)} ({listing.review_count.toLocaleString()} reviews)
              </p>
            )}
          </div>
          <div className="flex-shrink-0">
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground border">
              Info only
            </span>
          </div>
        </div>

        {/* Benefits */}
        <h2 className="text-xl font-bold text-foreground mb-5">What you get as a platform partner</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {benefits.map((b) => (
            <div key={b.title} className="bg-card rounded-xl border p-4 flex gap-3">
              <span className="text-2xl flex-shrink-0" aria-hidden="true">{b.icon}</span>
              <div>
                <p className="font-semibold text-foreground text-sm">{b.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Founding partner callout */}
        <div className="bg-accent/5 border border-accent/30 rounded-2xl p-6 mb-8 text-center">
          <div className="text-3xl mb-2" aria-hidden="true">🏆</div>
          <h3 className="font-bold text-foreground text-lg mb-1">Founding Partner Offer</h3>
          <p className="text-muted-foreground text-sm">
            The first 50 businesses to join get <strong className="text-foreground">permanent Founding Partner status</strong> —
            priority placement, a gold badge, and no platform fee for the first year.
          </p>
        </div>

        {/* CTA */}
        <div className="text-center space-y-3">
          <a
            href={`mailto:partners@vztourism.com?subject=I want to join VZ Tourism&body=Hi, I'm the owner of ${listing.name} and I'd like to join the platform.`}
            className="block w-full py-4 px-6 rounded-2xl text-primary-foreground font-bold text-lg transition-all hover:shadow-lg hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none bg-primary hover:bg-primary/90"
          >
            Join as a Founding Partner →
          </a>
          <p className="text-sm text-muted-foreground">
            Or view your current listing{' '}
            <Link href={`/listing/${listing.slug}`} className="text-primary hover:underline">
              here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
