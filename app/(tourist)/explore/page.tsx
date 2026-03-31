import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ItineraryFeedCard } from '@/components/social/ItineraryFeedCard';
import type { Itinerary } from '@/types/database';

export const metadata: Metadata = {
  title: 'Community Itineraries',
  description: 'Discover travel itineraries created by the Venezuela tourism community',
};

export default async function ExplorePage() {
  const supabase = await createClient();

  const { data: itineraries } = await supabase
    .from('itineraries')
    .select('*, user:users(id, full_name, avatar_url, role)')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(24);

  return (
    <div className="container px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Community Itineraries</h1>
        <p className="text-muted-foreground mt-2">
          Discover real travel itineraries from Venezuela explorers
        </p>
      </div>

      {itineraries && itineraries.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {itineraries.map((itinerary) => (
            <ItineraryFeedCard key={itinerary.id} itinerary={itinerary as Itinerary} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-2xl mb-2">🗺️</p>
          <h3 className="font-semibold text-lg">No public itineraries yet</h3>
          <p className="text-muted-foreground mt-1">Be the first to share your Venezuela adventure!</p>
        </div>
      )}
    </div>
  );
}
