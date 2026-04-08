import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ItinerariesClient } from './ItinerariesClient';

export const metadata: Metadata = {
  title: 'Discover Itineraries | VZ Explorer',
  description: 'Browse curated Venezuela trip plans from travelers and creators who know the country best',
};

export default async function ItinerariesPage() {
  let itineraries: unknown[] = [];
  let count = 0;
  let influencerPicks: unknown[] = [];
  let regions: string[] = [];

  try {
    const supabase = await createClient();
    if (supabase) {
      // Fetch popular itineraries
      const { data, count: totalCount } = await supabase
        .from('itineraries')
        .select('*, user:users(full_name, avatar_url, role)', { count: 'exact' })
        .eq('is_public', true)
        .order('saves', { ascending: false })
        .limit(20);

      if (data) {
        itineraries = data.map((item: Record<string, unknown>) => ({
          ...item,
          recommendation_count: ((item.saves as number) || 0) + ((item.likes as number) || 0),
        }));
      }
      count = totalCount || 0;

      // Fetch distinct regions
      const { data: allItineraries } = await supabase
        .from('itineraries')
        .select('regions')
        .eq('is_public', true);

      if (allItineraries) {
        const regionSet = new Set<string>();
        allItineraries.forEach((it: { regions: string[] }) => {
          (it.regions || []).forEach((r: string) => regionSet.add(r));
        });
        regions = Array.from(regionSet).sort();
      }

      // Fallback regions if none found
      if (regions.length === 0) {
        regions = ['Los Roques', 'Mérida', 'Canaima', 'Margarita', 'Caracas', 'Gran Sabana'];
      }

      // Fetch influencer picks
      const { data: influencerItineraries } = await supabase
        .from('itineraries')
        .select('*, user:users(full_name, avatar_url, role)')
        .eq('is_public', true)
        .eq('is_influencer_pick', true)
        .order('saves', { ascending: false })
        .limit(6);

      if (influencerItineraries && influencerItineraries.length > 0) {
        // Fetch creator profiles for influencer itineraries
        const userIds = influencerItineraries.map((i: Record<string, unknown>) => i.user_id);
        const { data: creators } = await supabase
          .from('creator_profiles')
          .select('*')
          .in('user_id', userIds);

        if (creators) {
          influencerPicks = influencerItineraries
            .map((it: Record<string, unknown>) => {
              const creator = creators.find((c: Record<string, unknown>) => c.user_id === it.user_id);
              if (!creator) return null;
              return { creator, itinerary: it };
            })
            .filter(Boolean);
        }
      }
    }
  } catch {
    // Supabase not configured
  }

  // Demo data when no Supabase connection
  if (itineraries.length === 0) {
    const demoBase = {
      is_public: true, is_template: false, is_influencer_pick: false, referral_code: null,
      start_date: null, end_date: null, created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z',
    };
    itineraries = [
      { ...demoBase, id: 'demo-1', user_id: 'u1', title: 'Canaima & Angel Falls: Complete 5-Day Adventure', description: 'Stay at Campamento Tapuy Lodge on the lagoon, take a curiara upriver to Angel Falls, walk behind Salto El Sapo, and explore the Gran Sabana by 4x4.', cover_image_url: 'https://images.unsplash.com/photo-1580767733747-e17c7c72de44?w=800', total_days: 5, estimated_cost_usd: 1350, regions: ['Canaima', 'Gran Sabana'], tags: ['adventure', 'waterfall'], likes: 487, saves: 802, views: 6100, is_influencer_pick: true, recommendation_count: 1289, user: { full_name: 'Valentina Rojas', avatar_url: null, role: 'creator' } },
      { ...demoBase, id: 'demo-2', user_id: 'u2', title: 'Los Roques: Caribbean Paradise Island Hopping', description: 'Stay at Posada Piano y Papaya, hop between turquoise cays, snorkel pristine reefs, try kitesurfing at Play Los Roques, and eat fresh lobster on the beach.', cover_image_url: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=800', total_days: 5, estimated_cost_usd: 1600, regions: ['Los Roques'], tags: ['beach', 'snorkeling', 'luxury'], likes: 512, saves: 735, views: 5200, is_influencer_pick: true, recommendation_count: 1247, user: { full_name: 'Sofia Mendez', avatar_url: null, role: 'creator' } },
      { ...demoBase, id: 'demo-3', user_id: 'u3', title: 'Caracas: The Real City Behind the Headlines', description: 'Hike El Avila at sunrise, eat arepas at Arepera Socialista, explore street art in Chacao, and escape to Choroni for cacao and Caribbean beaches.', cover_image_url: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800', total_days: 4, estimated_cost_usd: 580, regions: ['Caracas'], tags: ['city', 'food', 'culture'], likes: 298, saves: 467, views: 3400, is_influencer_pick: true, recommendation_count: 765, user: { full_name: 'Ben Thompson', avatar_url: null, role: 'creator' } },
      { ...demoBase, id: 'demo-4', user_id: 'u4', title: 'Margarita Island: Beaches, Culture & Nightlife', description: 'Surf at Playa Parguito, kitesurf at El Yaque, kayak through La Restinga mangroves with flamingos, and eat the freshest seafood at El Fondeadero.', cover_image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', total_days: 5, estimated_cost_usd: 780, regions: ['Margarita'], tags: ['beach', 'surf', 'nightlife'], likes: 245, saves: 367, views: 3100, recommendation_count: 612, user: { full_name: 'Carlos Rodriguez', avatar_url: null, role: 'tourist' } },
      { ...demoBase, id: 'demo-5', user_id: 'u1', title: 'Morrocoy: Venezuela\'s Secret Caribbean Cayos', description: 'Boat-hop between deserted islands from Chichiriviche, snorkel coral gardens at Cayo Borracho, watch flamingos at Cuare Wildlife Refuge. Budget-friendly paradise.', cover_image_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800', total_days: 3, estimated_cost_usd: 320, regions: ['Morrocoy'], tags: ['beach', 'budget', 'nature'], likes: 178, saves: 312, views: 2400, is_influencer_pick: true, recommendation_count: 490, user: { full_name: 'Valentina Rojas', avatar_url: null, role: 'creator' } },
    ];
    count = itineraries.length;
    regions = ['Canaima', 'Caracas', 'Gran Sabana', 'Los Roques', 'Margarita', 'Morrocoy'];

    influencerPicks = [
      { creator: { id: 'cp1', user_id: 'u1', username: 'venezolanaviajera', bio: 'Venezuelan travel creator', avatar_url: null, instagram_handle: '@venezolanaviajera', followers: 125000, is_verified: true }, itinerary: itineraries[0] },
      { creator: { id: 'cp2', user_id: 'u2', username: 'luxelatam', bio: 'Luxury Latin America travel', avatar_url: null, instagram_handle: '@luxelatam', followers: 210000, is_verified: true }, itinerary: itineraries[1] },
      { creator: { id: 'cp3', user_id: 'u3', username: 'backpackerben', bio: 'Adventure travel from London', avatar_url: null, instagram_handle: '@backpackerben', followers: 89000, is_verified: true }, itinerary: itineraries[2] },
    ];
  }

  return (
    <div className="container px-4 py-8 max-w-6xl mx-auto">
      <ItinerariesClient
        initialItineraries={itineraries as Parameters<typeof ItinerariesClient>[0]['initialItineraries']}
        initialCount={count}
        influencerPicks={influencerPicks as unknown as Parameters<typeof ItinerariesClient>[0]['influencerPicks']}
        regions={regions}
      />
    </div>
  );
}
