'use client';

import { useState } from 'react';
import { MapPin, Phone, Globe, Share2, Bell, ExternalLink } from 'lucide-react';
import type { ScrapedListing } from '@/lib/local-listings';

interface ScrapedListingViewProps {
  listing: ScrapedListing;
}

const REGION_LABELS: Record<string, string> = {
  caracas: 'Caracas',
  losroques: 'Los Roques',
  merida: 'Mérida',
  margarita: 'Isla Margarita',
  morrocoy: 'Morrocoy',
  canaima: 'Canaima',
  choroni: 'Choroní',
  falcon: 'Falcón',
  venezuela: 'Venezuela',
};

const TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  posada: 'Posada',
  hostal: 'Hostal',
  hospedaje: 'Hospedaje',
  alojamiento: 'Alojamiento',
  'casa vacacional': 'Casa Vacacional',
  restaurante: 'Restaurant',
  restaurant: 'Restaurant',
  cafe: 'Café',
  bar: 'Bar',
  tours: 'Tour Operator',
  tour: 'Tour Operator',
  transfer: 'Transfer',
  experience: 'Experience',
  agencia: 'Agency',
};

function StarRating({ rating, count }: { rating: number; count: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <div className="flex items-center gap-2" role="img" aria-label={`${rating.toFixed(1)} out of 5 stars, ${count.toLocaleString()} reviews`}>
      <div className="flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: full }).map((_, i) => (
          <span key={`f${i}`} className="text-accent text-lg">★</span>
        ))}
        {half && <span className="text-accent text-lg">★</span>}
        {Array.from({ length: empty }).map((_, i) => (
          <span key={`e${i}`} className="text-muted-foreground/30 text-lg">★</span>
        ))}
      </div>
      <span className="font-bold text-foreground text-lg">{rating.toFixed(1)}</span>
      <span className="text-sm text-muted-foreground">({count.toLocaleString()} reviews)</span>
    </div>
  );
}

export function ScrapedListingView({ listing }: ScrapedListingViewProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copyDone, setCopyDone] = useState(false);

  const regionLabel = REGION_LABELS[listing.region?.toLowerCase()] ?? listing.region ?? 'Venezuela';
  const typeLabel = TYPE_LABELS[listing.type?.toLowerCase()] ?? listing.type ?? 'Business';

  const whatsappNumber = listing.phone?.replace(/\D/g, '');
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi! I found your listing on VZ Tourism and would like to inquire about ${listing.name}.`)}`
    : null;

  async function handleNotify(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      await fetch('/api/notifications/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, listing_id: listing.id }),
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopyInvite() {
    const url = `${window.location.origin}/invite/${listing.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
            {typeLabel}
          </span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent/10 text-accent-foreground border border-accent/30">
            Not yet on platform
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{listing.name}</h1>
        <div className="flex items-center gap-1 text-muted-foreground text-sm">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span>{listing.address || regionLabel}</span>
        </div>
        {listing.avg_rating && listing.review_count > 0 && (
          <div className="mt-3">
            <StarRating rating={listing.avg_rating} count={listing.review_count} />
            <p className="text-xs text-muted-foreground/60 mt-1">Google Reviews</p>
          </div>
        )}
      </div>

      {/* Photo */}
      {listing.cover_image_url && (
        <div className="mb-8 rounded-2xl overflow-hidden relative h-64 md:h-96">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={listing.cover_image_url}
            alt={`Photo of ${listing.name}`}
            className="w-full h-full object-cover"
            loading="eager"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {listing.description && (
            <div>
              <h2 className="font-semibold text-foreground mb-2">About</h2>
              <p className="text-muted-foreground leading-relaxed">{listing.description}</p>
            </div>
          )}

          {/* Contact info */}
          <div>
            <h2 className="font-semibold text-foreground mb-3">Contact</h2>
            <div className="space-y-2">
              {listing.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4 text-muted-foreground/60" />
                  <a href={`tel:${listing.phone}`} className="hover:text-primary transition-colors">
                    {listing.phone}
                  </a>
                </div>
              )}
              {listing.website && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="w-4 h-4 text-muted-foreground/60" />
                  <a
                    href={listing.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors flex items-center gap-1"
                  >
                    {listing.website.replace(/^https?:\/\//, '')}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              {listing.instagram_handle && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-muted-foreground/60 text-base leading-none">📷</span>
                  <a
                    href={`https://instagram.com/${listing.instagram_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    @{listing.instagram_handle}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: action panel */}
        <div className="space-y-4">
          {/* Not yet on platform notice */}
          <div className="rounded-2xl border-2 border-dashed border-border p-5 space-y-4">
            <div className="text-center">
              <div className="text-3xl mb-2">🏗️</div>
              <h3 className="font-semibold text-foreground">Not on the platform yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                This business hasn't joined VZ Tourism. Contact them directly or get notified when they do.
              </p>
            </div>

            {/* WhatsApp CTA */}
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{ background: '#25D366' }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.522 5.85L.057 23.854l6.19-1.418A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.694-.503-5.24-1.38l-.375-.222-3.876.888.924-3.763-.245-.387A9.937 9.937 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                </svg>
                Contact via WhatsApp
              </a>
            )}

            {listing.website && (
              <a
                href={listing.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-muted transition-colors"
              >
                <Globe className="w-4 h-4" />
                Visit Website
              </a>
            )}
          </div>

          {/* Notify me form */}
          <div className="rounded-2xl bg-primary/5 border border-primary/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">Get notified when they join</h3>
            </div>
            {submitted ? (
              <p className="text-sm text-primary font-medium">
                ✓ You're on the list! We'll email you when they join.
              </p>
            ) : (
              <form onSubmit={handleNotify} className="space-y-2">
                <label htmlFor="notify-email" className="sr-only">Your email address</label>
                <input
                  id="notify-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full text-sm px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2 px-4 rounded-lg text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : 'Notify Me'}
                </button>
              </form>
            )}
          </div>

          {/* Invite owner */}
          <div className="rounded-2xl bg-muted border border-border p-5">
            <div className="flex items-center gap-2 mb-2">
              <Share2 className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground text-sm">Know the owner?</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Share this invite link with them to join VZ Tourism as a platform partner.
            </p>
            <button
              onClick={handleCopyInvite}
              className="w-full py-2 px-4 rounded-lg text-sm font-semibold border border-border text-foreground hover:bg-background transition-colors"
            >
              {copyDone ? '✓ Link copied!' : 'Copy Invite Link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
