'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, Clock, Users, Globe, Check, CheckCircle, XCircle, Star,
  MessageCircle, ExternalLink, Share2, ChevronDown, ChevronUp,
  Wifi, Car, Coffee, Utensils, Waves, Mountain, TreePine,
  Thermometer, ShieldCheck, Sparkles, Camera,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ImageGallery } from '@/components/common/ImageGallery';
import { InstagramIcon } from '@/components/common/InstagramIcon';
import { SafetyBadge } from '@/components/common/SafetyBadge';
import { FavoriteButton } from './FavoriteButton';
import { BookingForm } from './BookingForm';
import { ListingMap } from './ListingMap';
import { ReviewSection } from './ReviewSection';
import { useRecentlyViewed } from '@/hooks/use-recently-viewed';
import { useItineraryStore } from '@/stores/itinerary-store';
import type { Listing, Review } from '@/types/database';
import { formatDuration, pluralize } from '@/lib/utils';
import { LISTING_CATEGORIES } from '@/lib/constants';

interface ListingDetailProps {
  listing: Listing;
  reviews: Review[];
  canReview?: boolean;
  bookingId?: string;
}


const AMENITY_ICONS: Record<string, React.ReactNode> = {
  wifi: <Wifi className="w-4 h-4" />,
  'wi-fi': <Wifi className="w-4 h-4" />,
  internet: <Wifi className="w-4 h-4" />,
  parking: <Car className="w-4 h-4" />,
  estacionamiento: <Car className="w-4 h-4" />,
  breakfast: <Coffee className="w-4 h-4" />,
  desayuno: <Coffee className="w-4 h-4" />,
  restaurant: <Utensils className="w-4 h-4" />,
  restaurante: <Utensils className="w-4 h-4" />,
  pool: <Waves className="w-4 h-4" />,
  piscina: <Waves className="w-4 h-4" />,
  beach: <Waves className="w-4 h-4" />,
  playa: <Waves className="w-4 h-4" />,
  mountain: <Mountain className="w-4 h-4" />,
  'air conditioning': <Thermometer className="w-4 h-4" />,
  'aire acondicionado': <Thermometer className="w-4 h-4" />,
  ac: <Thermometer className="w-4 h-4" />,
  security: <ShieldCheck className="w-4 h-4" />,
  seguridad: <ShieldCheck className="w-4 h-4" />,
  nature: <TreePine className="w-4 h-4" />,
  naturaleza: <TreePine className="w-4 h-4" />,
};

function getAmenityIcon(amenity: string): React.ReactNode {
  const lower = amenity.toLowerCase();
  for (const [key, icon] of Object.entries(AMENITY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return <Sparkles className="w-4 h-4" />;
}

const sectionAnimation = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' as const },
  transition: { duration: 0.5, ease: 'easeOut' as const },
};

export function ListingDetail({ listing, reviews, canReview, bookingId }: ListingDetailProps) {
  const { track } = useRecentlyViewed();
  const { addStop, days, openPanel } = useItineraryStore();
  const [addedToItinerary, setAddedToItinerary] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);
  const [descOverflows, setDescOverflows] = useState(false);

  useEffect(() => {
    track({
      id: listing.id,
      slug: listing.slug,
      title: listing.title,
      cover_image_url: listing.cover_image_url,
      location_name: listing.location_name,
      price_usd: listing.price_usd,
      category: listing.category,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing.id]);

  useEffect(() => {
    const el = descRef.current;
    if (el) {
      setDescOverflows(el.scrollHeight > el.clientHeight);
    }
  }, [listing.description]);

  const category = LISTING_CATEGORIES.find((c) => c.value === listing.category);
  const photos = listing.photos || [];
  const allImages = [
    ...(listing.cover_image_url ? [{ url: listing.cover_image_url, alt: listing.title }] : []),
    ...photos.map((p) => ({ url: p.url, alt: p.alt || listing.title })),
  ];

  const instagramHandle = listing.provider?.instagram_handle;

  const scrollToBooking = () => {
    const el = document.getElementById('booking-form-anchor');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleShare = async () => {
    const shareData = {
      title: listing.title,
      text: `Check out ${listing.title} on Vamos A Venezuela`,
      url: window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      } catch { /* clipboard not available */ }
    }
  };

  const handleAddToItinerary = () => {
    const targetDay = days.length > 0 ? days[days.length - 1].day : 1;
    const stopCount = days.length > 0 ? days[days.length - 1].stops.length : 0;
    addStop({
      itinerary_id: '',
      day: targetDay,
      order: stopCount + 1,
      listing_id: listing.id,
      title: listing.title,
      description: listing.short_description ?? null,
      latitude: listing.latitude ?? null,
      longitude: listing.longitude ?? null,
      location_name: listing.location_name ?? null,
      start_time: null,
      end_time: null,
      duration_hours: listing.duration_hours ?? null,
      cost_usd: listing.price_usd ?? 0,
      transport_to_next: null,
      transport_duration_minutes: null,
      notes: null,
      listing: listing,
    });
    openPanel();
    setAddedToItinerary(true);
    setTimeout(() => setAddedToItinerary(false), 2500);
  };

  return (
    <div className="pb-24 lg:pb-8">
      {/* ── Hero Gallery ─────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 pt-4 md:pt-6">
        {allImages.length > 0 ? (
          <ImageGallery
            images={allImages}
            variant="hero"
            overlay={
              <div className="absolute top-3 right-3 md:top-4 md:right-4 flex items-center gap-2 z-10">
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center justify-center min-w-[40px] min-h-[40px] w-11 h-11 rounded-full bg-white/90 shadow-sm hover:bg-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={shareCopied ? 'Link copied' : 'Share this listing'}
                >
                  {shareCopied ? (
                    <Check className="w-5 h-5 text-status-confirmed" />
                  ) : (
                    <Share2 className="w-5 h-5 text-foreground" />
                  )}
                </button>
                <FavoriteButton listingId={listing.id} />
              </div>
            }
          />
        ) : (
          <div className="w-full aspect-[2.5/1] rounded-2xl bg-muted flex items-center justify-center">
            <Camera className="w-12 h-12 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* ── Header ─────────────────────────────────────────── */}
      <motion.div
        className="max-w-6xl mx-auto px-4 mt-5 md:mt-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="capitalize">
                {category?.icon} {listing.category}
              </Badge>
              <SafetyBadge level={listing.safety_level} />
              {listing.is_featured && (
                <Badge className="bg-accent text-accent-foreground">Featured</Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-balance leading-tight">{listing.title}</h1>
            <div className="flex items-center gap-3 text-muted-foreground text-sm flex-wrap">
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-accent text-accent" />
                <strong className="text-foreground tabular-nums">{(listing.rating ?? 0).toFixed(1)}</strong>
                <span className="tabular-nums">({pluralize(listing.total_reviews, 'review')})</span>
              </span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {listing.location_name}
              </span>
              {listing.region && !listing.location_name.toLowerCase().includes(listing.region.toLowerCase()) && (
                <>
                  <span className="text-border">|</span>
                  <span className="capitalize">{listing.region}</span>
                </>
              )}
            </div>
          </div>
          {/* Price — above fold on mobile; hidden on desktop where sidebar handles it */}
          {listing.price_usd > 0 && (
            <div className="lg:hidden text-right shrink-0">
              <p className="text-2xl font-bold tabular-nums">${listing.price_usd.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">per person</p>
            </div>
          )}
        </div>

        {/* Tags */}
        {listing.tags && listing.tags.length > 0 && (
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            {listing.tags.slice(0, 8).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Main content grid ──────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          {/* Main content column */}
          <div className="lg:col-span-2 space-y-8">
            {/* ── Highlights strip ─────────────────────────── */}
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-4 gap-3"
              {...sectionAnimation}
            >
              {listing.duration_hours && (
                <div className="flex flex-col items-center text-center p-4 rounded-xl bg-muted/30 border border-border/50">
                  <Clock className="w-5 h-5 text-primary mb-1.5" />
                  <span className="font-semibold text-sm tabular-nums">{formatDuration(listing.duration_hours)}</span>
                  <span className="text-xs text-muted-foreground mt-0.5">Duration</span>
                </div>
              )}
              <div className="flex flex-col items-center text-center p-4 rounded-xl bg-muted/30 border border-border/50">
                <Users className="w-5 h-5 text-primary mb-1.5" />
                <span className="font-semibold text-sm tabular-nums">Up to {listing.max_guests}</span>
                <span className="text-xs text-muted-foreground mt-0.5">Guests</span>
              </div>
              <div className="flex flex-col items-center text-center p-4 rounded-xl bg-muted/30 border border-border/50">
                <Globe className="w-5 h-5 text-primary mb-1.5" />
                <span className="font-semibold text-sm">{listing.languages.join(', ').toUpperCase()}</span>
                <span className="text-xs text-muted-foreground mt-0.5">Languages</span>
              </div>
              {listing.total_bookings > 0 && (
                <div className="flex flex-col items-center text-center p-4 rounded-xl bg-muted/30 border border-border/50">
                  <CheckCircle className="w-5 h-5 text-status-confirmed mb-1.5" />
                  <span className="font-semibold text-sm tabular-nums">{listing.total_bookings}</span>
                  <span className="text-xs text-muted-foreground mt-0.5">Bookings</span>
                </div>
              )}
            </motion.div>

            <Separator />

            {/* ── Description ──────────────────────────────── */}
            <motion.div {...sectionAnimation}>
              <h2 className="text-xl font-bold mb-3">About this experience</h2>
              <div className="relative">
                <p
                  ref={descRef}
                  className={`text-muted-foreground leading-relaxed whitespace-pre-line text-pretty transition-all duration-300 ${
                    !descExpanded ? 'max-h-[180px] overflow-hidden' : ''
                  }`}
                >
                  {listing.description}
                </p>
                {!descExpanded && descOverflows && (
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
                )}
              </div>
              {descOverflows && (
                <button
                  type="button"
                  onClick={() => setDescExpanded(!descExpanded)}
                  className="mt-2 text-sm font-medium text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {descExpanded ? (
                    <>Show less <ChevronUp className="w-4 h-4" /></>
                  ) : (
                    <>Read more <ChevronDown className="w-4 h-4" /></>
                  )}
                </button>
              )}
            </motion.div>

            {/* ── Amenities ────────────────────────────────── */}
            {listing.amenities.length > 0 && (
              <>
                <Separator />
                <motion.div {...sectionAnimation}>
                  <h2 className="text-xl font-bold mb-4">Amenities</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {listing.amenities.map((amenity, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2.5 py-2.5 px-3 rounded-lg bg-muted/20 border border-border/40 text-sm"
                      >
                        <span className="text-primary shrink-0">{getAmenityIcon(amenity)}</span>
                        <span className="capitalize truncate">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </>
            )}

            {/* ── Includes / Excludes ──────────────────────── */}
            {(listing.includes.length > 0 || listing.excludes.length > 0) && (
              <>
                <Separator />
                <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-6" {...sectionAnimation}>
                  {listing.includes.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">What&#39;s included</h3>
                      <ul className="space-y-2">
                        {listing.includes.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-status-confirmed flex-shrink-0 mt-0.5" aria-hidden="true" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {listing.excludes.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Not included</h3>
                      <ul className="space-y-2">
                        {listing.excludes.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <XCircle className="w-4 h-4 text-status-cancelled flex-shrink-0 mt-0.5" aria-hidden="true" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              </>
            )}

            {/* ── Instagram Section ───────────────────────── */}
            {instagramHandle && (
              <>
                <Separator />
                <motion.div {...sectionAnimation}>
                  <h2 className="text-xl font-bold mb-4">See it on Instagram</h2>
                  <a
                    href={`https://instagram.com/${instagramHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-all duration-300"
                  >
                    <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
                      <InstagramIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        @{instagramHandle}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Browse their latest photos, stories, and updates
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </a>
                </motion.div>
              </>
            )}

            {/* ── Provider / Host ──────────────────────────── */}
            {listing.provider && (
              <>
                <Separator />
                <motion.div {...sectionAnimation}>
                  <h2 className="text-xl font-bold mb-4">Your host</h2>
                  <div className="p-5 rounded-xl border border-border bg-muted/10">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-16 h-16 border-2 border-primary/20">
                        <AvatarImage src={listing.provider.logo_url || undefined} />
                        <AvatarFallback className="text-lg">{listing.provider.business_name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-lg">{listing.provider.business_name}</h3>
                          {listing.provider.is_verified && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <ShieldCheck className="w-3 h-3" /> Verified
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-accent text-accent" />
                            <span className="tabular-nums">{(listing.provider.rating ?? 0).toFixed(1)}</span>
                          </span>
                          <span className="text-border">|</span>
                          <span className="tabular-nums">{pluralize(listing.provider.total_reviews, 'review')}</span>
                          {listing.provider.region && (
                            <>
                              <span className="text-border">|</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {listing.provider.region}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-3 leading-relaxed text-pretty">
                          {listing.provider.description}
                        </p>
                        {/* Provider social links */}
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {instagramHandle && (
                            <a
                              href={`https://instagram.com/${instagramHandle}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md bg-muted/50 border border-border/50 transition-colors"
                            >
                              <InstagramIcon className="w-3.5 h-3.5" />
                              @{instagramHandle}
                            </a>
                          )}
                          {listing.provider.website_url && /^https?:\/\//i.test(listing.provider.website_url) && (
                            <a
                              href={listing.provider.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md bg-muted/50 border border-border/50 transition-colors"
                            >
                              <Globe className="w-3.5 h-3.5" />
                              Website
                            </a>
                          )}
                          {listing.provider.whatsapp_number && (
                            <a
                              href={`https://wa.me/${listing.provider.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in "${listing.title}"`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md bg-muted/50 border border-border/50 transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </>
            )}

            <Separator />

            {/* ── Reviews ──────────────────────────────────── */}
            <motion.div {...sectionAnimation}>
              <h2 className="text-xl font-bold mb-4">
                Reviews {reviews.length > 0 && <span className="tabular-nums">({reviews.length})</span>}
              </h2>
              <ReviewSection
                listingId={listing.id}
                reviews={reviews}
                canReview={canReview}
                bookingId={bookingId}
              />
            </motion.div>
          </div>

          {/* ── Sidebar ────────────────────────────────────── */}
          <div id="booking-form-anchor" className="lg:col-span-1 lg:sticky lg:top-24 space-y-4 self-start">
            <BookingForm listing={listing} />

            {/* Add to itinerary */}
            <button
              onClick={handleAddToItinerary}
              className="w-full py-3 rounded-xl border-2 border-primary text-primary font-semibold text-sm hover:bg-primary/5 transition-colors duration-150 ease-out flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {addedToItinerary ? '+ Added to itinerary' : '+ Add to itinerary'}
            </button>

            {/* Map */}
            {listing.latitude && listing.longitude && (
              <div>
                <ListingMap
                  lat={listing.latitude}
                  lng={listing.longitude}
                  title={listing.title}
                  className="w-full h-48 rounded-xl overflow-hidden border"
                />
                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {listing.location_name}
                </p>
              </div>
            )}

            {listing.cancellation_policy && (
              <div className="p-4 rounded-xl bg-muted/30 border text-sm">
                <p className="font-semibold mb-1">Cancellation policy</p>
                <p className="text-muted-foreground leading-relaxed text-pretty">{listing.cancellation_policy}</p>
              </div>
            )}

            {/* WhatsApp contact */}
            {listing.provider?.whatsapp_number && (
              <a
                href={`https://wa.me/${listing.provider.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in "${listing.title}"`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-muted transition-colors duration-150 ease-out"
              >
                <MessageCircle className="w-4 h-4" />
                Message on WhatsApp
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            )}

            {/* Instagram CTA in sidebar */}
            {instagramHandle && (
              <a
                href={`https://instagram.com/${instagramHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-muted transition-colors duration-150 ease-out"
              >
                <InstagramIcon className="w-4 h-4" />
                View on Instagram
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky mobile booking CTA ──────────────────────── */}
      {listing.price_usd > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-30 lg:hidden px-4 pb-2">
          <div className="bg-background border border-border rounded-xl shadow-lg flex items-center justify-between px-4 py-3">
            <div>
              <span className="text-lg font-bold text-foreground tabular-nums">${listing.price_usd.toFixed(0)}</span>
              <span className="text-xs text-muted-foreground ml-1">/ person / night</span>
            </div>
            <motion.button
              type="button"
              onClick={scrollToBooking}
              whileTap={{ scale: 0.96 }}
              className="bg-primary text-primary-foreground font-semibold text-sm px-5 py-2 rounded-lg hover:opacity-90 transition-opacity duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Reserve
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
