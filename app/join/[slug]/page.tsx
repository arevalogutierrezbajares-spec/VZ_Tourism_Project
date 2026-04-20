import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getListingBySlug, getAllListings } from '@/lib/local-listings';
import { Star, MapPin, Clock, CreditCard, CheckCircle2 } from 'lucide-react';

interface Props {
  params: Promise<{ slug: string }>;
}

type ListingWithPhotos = ReturnType<typeof getListingBySlug> & { photos?: string[] };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = getListingBySlug(slug);
  if (!listing) notFound();
  return {
    title: `${listing.name} — Claim Your Listing`,
    description: `${listing.name} is already on VZ Explorer. Claim your listing and start receiving bookings today.`,
  };
}

export default async function JoinPage({ params }: Props) {
  const { slug } = await params;
  const listing = getListingBySlug(slug) as ListingWithPhotos | undefined;
  if (!listing) notFound();

  // Regional stats
  const all = getAllListings();
  const regionCount = all.filter((l) => l.region === listing.region).length;

  const capitalizedName = listing.name
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const coverPhoto = listing.cover_image_url;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="relative h-72 md:h-96 overflow-hidden">
        {coverPhoto ? (
          <Image
            src={coverPhoto}
            alt={listing.name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        {/* VZ Explorer brand bar */}
        <div className="absolute top-0 left-0 right-0 px-6 py-4 flex items-center justify-between">
          <span className="text-white font-bold text-lg tracking-tight">VZ Explorer</span>
        </div>
        {/* Hero text */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
          <div className="inline-flex items-center gap-1.5 bg-amber-400 text-amber-900 text-xs font-semibold px-3 py-1 rounded-full mb-3">
            <Star className="w-3 h-3 fill-amber-900" />
            Founding Partner Invitation
          </div>
          <h1 className="text-white text-2xl md:text-3xl font-bold leading-tight">
            {capitalizedName} is already on VZ Explorer!
          </h1>
          {listing.city && (
            <p className="text-white/80 text-sm mt-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {listing.city}, Venezuela
            </p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="bg-blue-600 text-white">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center justify-around gap-4">
          {listing.avg_rating && (
            <div className="text-center">
              <div className="text-xl font-bold flex items-center gap-1 justify-center">
                <Star className="w-4 h-4 fill-white" />
                {listing.avg_rating}
              </div>
              <div className="text-xs text-blue-100 mt-0.5">{listing.review_count.toLocaleString()} Google reviews</div>
            </div>
          )}
          {listing.avg_rating && (
            <div className="w-px h-10 bg-blue-500" />
          )}
          <div className="text-center">
            <div className="text-xl font-bold">{regionCount}</div>
            <div className="text-xs text-blue-100 mt-0.5">businesses in your region</div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-lg mx-auto px-6 py-8">
        <h2 className="text-xl font-bold text-foreground mb-2">
          Claim your listing and start receiving bookings
        </h2>
        <p className="text-muted-foreground text-sm mb-8">
          Your listing is already 90% ready — we scraped your information from Google.
          Just verify ownership and fill in what&apos;s missing.
        </p>

        {/* Benefits */}
        <div className="space-y-3 mb-8">
          {[
            { icon: '🏆', text: 'Free for 6 months (Founding Partner)', sub: '0% commission — you keep everything' },
            { icon: '⚡', text: 'Your listing is 90% ready', sub: 'Pre-filled from Google data' },
            { icon: '⏱️', text: 'Takes only 10 minutes', sub: 'Simple step-by-step setup' },
            { icon: '💸', text: 'Get paid via Zelle, USDT, or cash', sub: 'No complicated bank setups' },
          ].map((benefit) => (
            <div key={benefit.text} className="flex items-start gap-3 p-4 bg-muted rounded-xl">
              <span className="text-xl mt-0.5">{benefit.icon}</span>
              <div>
                <div className="font-semibold text-foreground text-sm">{benefit.text}</div>
                <div className="text-muted-foreground text-xs mt-0.5">{benefit.sub}</div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-status-confirmed ml-auto mt-0.5 shrink-0" />
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="border border-border rounded-xl p-5 mb-8">
          <h3 className="font-semibold text-foreground text-sm mb-4">What you&apos;ll do in 10 minutes</h3>
          <div className="space-y-3">
            {[
              { step: '1', label: 'Verify ownership', detail: 'Confirm via WhatsApp or Instagram' },
              { step: '2', label: 'Review your listing', detail: 'Confirm photos, description, amenities' },
              { step: '3', label: 'Set rooms & pricing', detail: 'Add room types and nightly rates' },
              { step: '4', label: 'Set availability', detail: 'Block dates if needed' },
              { step: '5', label: 'Add payment info', detail: 'Zelle, USDT, Binance, or cash' },
              { step: '6', label: 'Go live!', detail: 'Start receiving bookings' },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                  {item.step}
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">{item.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Founding Partner badge */}
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-5 mb-8 text-center">
          <div className="text-2xl mb-2">🏆</div>
          <div className="font-bold text-amber-900 mb-1">Founding Partner Program</div>
          <div className="text-sm text-amber-700">
            The first 100 businesses to join get <strong>0% commission</strong> for 6 months.
            After that, just 8% — the lowest in the industry.
          </div>
          <div className="mt-3 text-xs text-amber-600 flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" />
            Limited spots available for your region
          </div>
        </div>

        {/* Payment methods */}
        <div className="flex items-center gap-2 mb-8 flex-wrap justify-center">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Accepted payment methods:</span>
          {['Zelle', 'USDT', 'Binance Pay', 'Cash'].map((m) => (
            <span key={m} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">{m}</span>
          ))}
        </div>

        {/* CTA */}
        <Link
          href={`/onboard/${slug}`}
          className="block w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-center font-bold text-lg py-4 rounded-2xl transition-colors shadow-lg shadow-blue-200"
        >
          Get Started →
        </Link>
        <p className="text-center text-xs text-muted-foreground mt-3">
          Free to join · No credit card required · Cancel anytime
        </p>
      </div>
    </div>
  );
}
