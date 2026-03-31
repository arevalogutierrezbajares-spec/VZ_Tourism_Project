import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Share2, Globe, MapPin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ListingCard } from '@/components/listing/ListingCard';
import { createClient } from '@/lib/supabase/server';
import { getInitials, formatDate } from '@/lib/utils';
import type { Listing } from '@/types/database';

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('creator_profiles')
    .select('display_name, bio')
    .eq('username', username)
    .single();
  if (!data) return { title: 'Creator Not Found' };
  return { title: `${data.display_name} — Venezuela Travel Creator`, description: data.bio || undefined };
}

export default async function CreatorPage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: creator } = await supabase
    .from('creator_profiles')
    .select('*, user:users(full_name, avatar_url, created_at)')
    .eq('username', username)
    .single();

  if (!creator) notFound();

  // Get public itineraries by this creator
  const { data: itineraries } = await supabase
    .from('itineraries')
    .select('*')
    .eq('user_id', creator.user_id)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(6);

  // Get featured listings (from itinerary stops)
  const { data: featuredListings } = await supabase
    .from('listings')
    .select('*, provider:providers(business_name, is_verified)')
    .eq('is_published', true)
    .contains('tags', creator.niche_tags || [])
    .limit(4);

  return (
    <div className="container px-4 py-8 max-w-4xl mx-auto">
      {/* Creator Header */}
      <div className="flex flex-col sm:flex-row items-start gap-6 mb-8">
        <Avatar className="w-24 h-24 shadow-lg">
          <AvatarImage src={creator.user?.avatar_url || undefined} />
          <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
            {getInitials(creator.display_name || creator.user?.full_name || 'C')}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{creator.display_name || creator.user?.full_name}</h1>
            <Badge variant="secondary" className="text-xs">Creator</Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">@{creator.username}</p>

          {creator.bio && (
            <p className="text-sm mt-2 max-w-lg">{creator.bio}</p>
          )}

          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            {creator.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {creator.location}
              </span>
            )}
            {creator.instagram_handle && (
              <a
                href={`https://instagram.com/${creator.instagram_handle.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                {creator.instagram_handle}
              </a>
            )}
            {creator.website && (
              <a
                href={creator.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                Website
              </a>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-4">
            <div className="text-center">
              <p className="font-bold">{creator.followers_count || 0}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div className="text-center">
              <p className="font-bold">{itineraries?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Itineraries</p>
            </div>
            <div className="text-center">
              <p className="font-bold">{creator.total_likes || 0}</p>
              <p className="text-xs text-muted-foreground">Total Likes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Niche Tags */}
      {creator.niche_tags && creator.niche_tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {creator.niche_tags.map((tag: string) => (
            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
          ))}
        </div>
      )}

      {/* Itineraries */}
      {itineraries && itineraries.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">Travel Itineraries</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {itineraries.map((itinerary) => (
              <a
                key={itinerary.id}
                href={`/itinerary/${itinerary.id}`}
                className="block rounded-xl border bg-card hover:shadow-md transition-shadow p-4"
              >
                <h3 className="font-semibold text-sm line-clamp-2">{itinerary.title}</h3>
                {itinerary.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{itinerary.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>{itinerary.total_days} days</span>
                  {itinerary.regions?.length > 0 && <span>{itinerary.regions[0]}</span>}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Featured Experiences */}
      {featuredListings && featuredListings.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">Featured Experiences</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing as Listing} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
