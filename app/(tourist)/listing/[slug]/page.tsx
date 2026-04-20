import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ListingDetail } from '@/components/listing/ListingDetail';
import { ScrapedListingView } from '@/components/listing/ScrapedListingView';
import { createClient } from '@/lib/supabase/server';
import { getListingBySlug, mapTypeToCategory, isOnboarded } from '@/lib/local-listings';
import type { Listing, Review } from '@/types/database';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const supabase = await createClient();
    if (!supabase) throw new Error('Supabase not configured');
    const { data: listing } = await supabase
      .from('listings')
      .select('title, short_description, cover_image_url')
      .eq('slug', slug)
      .single();

    if (listing) {
      return {
        title: listing.title,
        description: listing.short_description,
        openGraph: {
          title: listing.title,
          description: listing.short_description,
          images: listing.cover_image_url ? [listing.cover_image_url] : [],
        },
      };
    }
  } catch {
    // Supabase not configured, fall through to local data
  }

  const scraped = getListingBySlug(slug);
  if (scraped) {
    return {
      title: scraped.name,
      description: scraped.description,
    };
  }

  return { title: 'Listing Not Found' };
}

export default async function ListingPage({ params }: Props) {
  const { slug } = await params;

  try {
    const supabase = await createClient();
    if (!supabase) throw new Error('Supabase not configured');
    const { data: supabaseListing } = await supabase
      .from('listings')
      .select('*, provider:providers(*), photos:listing_photos(*)')
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (supabaseListing) {
      const { data: reviews } = await supabase
        .from('reviews')
        .select('*, tourist:users(id, full_name, avatar_url)')
        .eq('listing_id', supabaseListing.id)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(20);

      void supabase.rpc('increment_listing_views', { listing_id: supabaseListing.id });

      // Check if current user has a completed booking for this listing
      const { data: { user } } = await supabase.auth.getUser();
      let canReview = false;
      let reviewBookingId: string | undefined;
      if (user) {
        const { data: completedBooking } = await supabase
          .from('guest_bookings')
          .select('id')
          .eq('guest_email', user.email)
          .eq('listing_id', supabaseListing.id)
          .eq('status', 'completed')
          .maybeSingle();
        if (completedBooking) {
          canReview = true;
          reviewBookingId = completedBooking.id;
        }
      }

      return (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'LodgingBusiness',
                name: supabaseListing.title,
                description: (supabaseListing.short_description as string | null)?.slice(0, 200),
                image: (supabaseListing as Listing).cover_image_url ?? undefined,
              }),
            }}
          />
          <ListingDetail
            listing={supabaseListing as Listing}
            reviews={(reviews || []) as Review[]}
            canReview={canReview}
            bookingId={reviewBookingId}
          />
        </>
      );
    }
  } catch {
    // Supabase not configured, fall through to local data
  }

  // Fallback to scraped local data
  const scraped = getListingBySlug(slug);
  if (!scraped) notFound();

  // Tier 1: not yet onboarded — show info-only view
  if (!isOnboarded(scraped)) {
    return <ScrapedListingView listing={scraped} />;
  }

  // Tier 2: verified/founding_partner — show full booking experience
  // Promoted listings have enriched fields from onboarding written to scraped-listings.json
  const enriched = scraped as unknown as Record<string, unknown>;
  const rooms = (enriched.rooms as Array<{ price_usd: number; max_guests: number }>) ?? [];
  const minPrice = rooms.length > 0 ? Math.min(...rooms.map((r) => r.price_usd)) : 0;
  const maxGuests = (enriched.max_guests as number) ?? (rooms.length > 0 ? Math.max(...rooms.map((r) => r.max_guests)) : 1);
  const onboardedAmenities = (enriched.amenities as string[]) ?? [];
  const cancellation = (enriched.cancellation_policy as string) ?? '';
  const selectedPhotos = (enriched.selected_photos as string[]) ?? [];
  const scrapedPhotos = (enriched.photos as string[]) ?? [];
  const photoUrls = selectedPhotos.length > 0 ? selectedPhotos : scrapedPhotos;

  const listing: Listing = {
    id: scraped.id,
    provider_id: scraped.provider_id,
    title: scraped.name,
    slug: scraped.slug,
    description: scraped.description,
    short_description: scraped.description.slice(0, 160),
    category: mapTypeToCategory(scraped.type) as Listing['category'],
    tags: scraped.category_tags,
    region: scraped.region,
    location_name: scraped.address || scraped.region,
    latitude: scraped.latitude,
    longitude: scraped.longitude,
    address: scraped.address || null,
    price_usd: minPrice,
    price_ves: null,
    currency: 'USD',
    duration_hours: null,
    max_guests: maxGuests,
    min_guests: 1,
    is_published: true,
    is_featured: scraped.platform_status === 'founding_partner',
    safety_level: 'yellow',
    rating: scraped.avg_rating || 0,
    total_reviews: scraped.review_count,
    total_bookings: 0,
    amenities: onboardedAmenities,
    languages: ['es'],
    includes: [],
    excludes: [],
    cancellation_policy: cancellation,
    meeting_point: null,
    cover_image_url: scraped.cover_image_url,
    photos: photoUrls.map((url, i) => ({ id: `photo-${i}`, listing_id: scraped.id, url, alt: scraped.name, order: i, created_at: scraped.created_at || new Date().toISOString() })),
    created_at: scraped.created_at || new Date().toISOString(),
    updated_at: scraped.updated_at || new Date().toISOString(),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LodgingBusiness',
            name: listing.title,
            description: listing.description?.slice(0, 200),
            image: listing.cover_image_url ?? undefined,
          }),
        }}
      />
      <ListingDetail listing={listing} reviews={[]} />
    </>
  );
}
