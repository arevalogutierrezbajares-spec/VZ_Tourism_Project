import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ListingDetail } from '@/components/listing/ListingDetail';
import { createClient } from '@/lib/supabase/server';
import type { Listing, Review } from '@/types/database';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: listing } = await supabase
    .from('listings')
    .select('title, short_description, cover_image_url')
    .eq('slug', slug)
    .single();

  if (!listing) return { title: 'Listing Not Found' };

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

export default async function ListingPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: listing } = await supabase
    .from('listings')
    .select('*, provider:providers(*), photos:listing_photos(*)')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (!listing) notFound();

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, tourist:users(id, full_name, avatar_url)')
    .eq('listing_id', listing.id)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(20);

  // Increment views (fire and forget)
  void supabase.rpc('increment_listing_views', { listing_id: listing.id });

  return (
    <ListingDetail
      listing={listing as Listing}
      reviews={(reviews || []) as Review[]}
    />
  );
}
