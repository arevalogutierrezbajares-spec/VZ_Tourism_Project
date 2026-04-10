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
    const s = (id: string, iid: string, day: number, order: number, title: string, desc: string, loc: string, cost: number, hrs: number, transport?: string, notes?: string) => ({
      id, itinerary_id: iid, day, order, title, description: desc, location_name: loc, latitude: null, longitude: null, start_time: null, end_time: null, duration_hours: hrs, cost_usd: cost, transport_to_next: transport || null, transport_duration_minutes: null, notes: notes || null, listing_id: null, created_at: '2026-04-01T00:00:00Z',
    });
    itineraries = [
      { ...demoBase, id: 'demo-1', user_id: 'u1', title: 'Canaima & Angel Falls: Complete 5-Day Adventure', description: 'Stay at Campamento Tapuy Lodge on the lagoon, take a curiara upriver to Angel Falls, walk behind Salto El Sapo, and explore the Gran Sabana by 4x4.', cover_image_url: 'https://images.unsplash.com/photo-1580767733747-e17c7c72de44?w=800', total_days: 5, estimated_cost_usd: 1350, regions: ['Canaima', 'Gran Sabana'], tags: ['adventure', 'waterfall'], likes: 487, saves: 802, views: 6100, is_influencer_pick: true, recommendation_count: 1289, user: { full_name: 'Valentina Rojas', avatar_url: null, role: 'creator' },
        stops: [
          s('s1a','demo-1',1,0,'Fly to Canaima + Lagoon Tour','Fly Conviasa from Caracas (~1hr). Check into Campamento Tapuy Lodge, a 16-room lodge right on Canaima Lagoon. Afternoon canoe ride to see Hacha Falls up close. Dinner at the lodge: grilled chicken with yuca.','Canaima Lagoon',350,5,'Canoe','Stay: Campamento Tapuy Lodge (~$120/night all-inclusive). Alt: Campamento Canaima (~$150/night). Conviasa flight ~$200 round-trip.'),
          s('s1b','demo-1',2,0,'Salto El Sapo + Salto El Sapito','Walk BEHIND the curtain of water at Salto El Sapo on a rocky path. Then visit Salto El Sapito nearby. Packed lunch from the lodge.','Isla Anatoly',80,7,'Motorized canoe','Bring waterproof bags for cameras. The walk behind Sapo is ~100m, slippery but incredible.'),
          s('s1c','demo-1',3,0,'River Journey to Angel Falls Base Camp','Full day upriver in a curiara (motorized dugout canoe) with Pemon guides. 4-5 hours through jungle canyons. Camp dinner: fresh fish, rice, beans over fire. Sleep in hammocks.','Isla Ratoncito',200,10,'Curiara canoe','Hammock camp. Basic but magical. You can hear the falls from camp.'),
          s('s1d','demo-1',4,0,'Angel Falls Hike + Return','Early morning 1.5hr hike to the Angel Falls viewpoint and natural pool at the base. The world\'s tallest waterfall at 979m. Return downriver to Canaima.','Angel Falls',200,10,'Flight','Best photos in the morning before clouds form. Total Angel Falls package ~$300-400pp.'),
          s('s1e','demo-1',5,0,'Gran Sabana Drive + Departure','Morning 4x4 drive to Quebrada de Jaspe (creek flowing over red jasper stone). Stop at an indigenous community for handmade crafts. Flight back to Caracas.','Gran Sabana',120,6,undefined,'Quebrada de Jaspe is ~2hrs from Canaima by road.'),
        ]},
      { ...demoBase, id: 'demo-2', user_id: 'u2', title: 'Los Roques: Caribbean Paradise Island Hopping', description: 'Stay at Posada Piano y Papaya, hop between turquoise cays, snorkel pristine reefs, try kitesurfing at Play Los Roques, and eat fresh lobster on the beach.', cover_image_url: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=800', total_days: 5, estimated_cost_usd: 1600, regions: ['Los Roques'], tags: ['beach', 'snorkeling', 'luxury'], likes: 512, saves: 735, views: 5200, is_influencer_pick: true, recommendation_count: 1247, user: { full_name: 'Sofia Mendez', avatar_url: null, role: 'creator' },
        stops: [
          s('s2a','demo-2',1,0,'Arrive Gran Roque + Village Walk','Fly from Caracas (35 min, ~$220 roundtrip). Check into Posada Piano y Papaya. Walk the colorful sandy streets. Sunset from El Faro lighthouse. Dinner at Restaurante Aquarena: grilled red snapper.','Gran Roque',380,5,'Penero boat','Stay: Posada Piano y Papaya (~$150/night). Restaurants: Aquarena, Bora La Mar, Cafe del Mar.'),
          s('s2b','demo-2',2,0,'Cayo de Agua Full Day','Penero boat to Cayo de Agua (~45 min). Famous sandbar connecting two islands. Crystal-clear snorkeling. Packed lunch on the beach. Return for dinner at Bora La Mar (lobster pasta).','Cayo de Agua',120,8,'Penero boat','Boat ~$30-50pp. Bring reef-safe sunscreen. No shade on the cay.'),
          s('s2c','demo-2',3,0,'Francisqui + Kitesurfing','Morning at Francisqui snorkeling the reef wall. 2-hour kite lesson at Play Los Roques. Lunch: fresh lobster grilled on the beach by the penero captain.','Francisqui',250,8,'Penero boat','Kite lesson ~$100-150 for 2hrs at Play Los Roques or Palafito Kiteschool.'),
          s('s2d','demo-2',4,0,'Crasqui + Noronqui Snorkeling','Remote western cays. Crasqui: pristine white sand, almost no one else. Noronqui: best reef snorkeling with sea turtles and rays. Optional scuba at Dive Center Los Roques.','Crasqui',180,8,'Penero boat','Dive Center Los Roques: ~$35/dive. Best snorkeling in the whole archipelago.'),
          s('s2e','demo-2',5,0,'Morning Swim + Departure','Early swim at Playa Gran Roque. Last coffee at Cafe del Mar. Buy handmade jewelry from artisans. Flight back.','Gran Roque',50,4,undefined,'Max 10kg luggage for return flight. Stock up on rum at the airport shop.'),
        ]},
      { ...demoBase, id: 'demo-3', user_id: 'u3', title: 'Caracas: The Real City Behind the Headlines', description: 'Hike El Avila at sunrise, eat arepas at Arepera Socialista, explore street art in Chacao, and escape to Choroni for cacao and Caribbean beaches.', cover_image_url: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800', total_days: 4, estimated_cost_usd: 580, regions: ['Caracas'], tags: ['city', 'food', 'culture'], likes: 298, saves: 467, views: 3400, is_influencer_pick: true, recommendation_count: 765, user: { full_name: 'Ben Thompson', avatar_url: null, role: 'creator' },
        stops: [
          s('s3a','demo-3',1,0,'Arrive + Las Mercedes Evening','Check into Hotel Cayena in Las Mercedes (~$90/night). Walk Altamira\'s Plaza Francia. Dinner at La Casa Bistro: modern Venezuelan cuisine. Craft beer at Social Club.','Las Mercedes',150,5,'Metro/taxi','Stay: Hotel Cayena. Alt: Lidotel (~$120/night). Alt: Renaissance Caracas (~$110/night).'),
          s('s3b','demo-3',2,0,'El Avila Hike + Chacao Food Tour','Sunrise hike up El Avila via Sabas Nieves trail (1.5hr). Breakfast at Arepera Socialista (best arepas: Reina Pepiada, Domino). Mercado de Chacao for tropical fruits. Street art walk in Los Palos Grandes.','El Avila',60,8,'Metro','Avila hike: free, start by 6am. Arepera Socialista: arepas ~$3-5 each. Try mamey and guanabana at the market.'),
          s('s3c','demo-3',3,0,'Choroni Day Trip: Cacao + Beach','Drive through Henri Pittier National Park (2.5hrs). Cacao plantation tour at Hacienda Chuao + chocolate tasting. Beach at Playa Grande. Lunch at Sabor del Mar: fried whole fish, patacones.','Choroni',140,10,'Hired car','Hacienda Chuao tour ~$25pp. Sabor del Mar: fish plate ~$10-12. Driver ~$80 roundtrip.'),
          s('s3d','demo-3',4,0,'Museums + El Hatillo + Departure','Morning at MACSI (contemporary art, free entry). Then El Hatillo colonial village for coffee and crafts. Lunch at Mokambo: cachapas con queso de mano. Departure.','El Hatillo',70,6,undefined,'MACSI: free, allow 1.5hrs. El Hatillo: 20min taxi, charming colonial streets. Mokambo: cachapas ~$5.'),
        ]},
      { ...demoBase, id: 'demo-4', user_id: 'u4', title: 'Margarita Island: Beaches, Culture & Nightlife', description: 'Surf at Playa Parguito, kitesurf at El Yaque, kayak through La Restinga mangroves with flamingos, and eat the freshest seafood at El Fondeadero.', cover_image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', total_days: 5, estimated_cost_usd: 780, regions: ['Margarita'], tags: ['beach', 'surf', 'nightlife'], likes: 245, saves: 367, views: 3100, recommendation_count: 612, user: { full_name: 'Carlos Rodriguez', avatar_url: null, role: 'tourist' },
        stops: [
          s('s4a','demo-4',1,0,'Arrive + Playa El Agua','Fly into Santiago Marino Airport. Check into Hotel Hesperia (~$90-130/night). Playa El Agua: 4km golden sand. Sunset mojitos at Guacuco Beach Bar. Dinner at El Paraiso: grilled lobster.','Playa El Agua',160,6,'Taxi','Stay: Hotel Hesperia. Alt: Sunsol Isla Caribe (~$70/night). Guacuco: cocktails ~$5-8.'),
          s('s4b','demo-4',2,0,'Playa Parguito Surf + Porlamar','Surf lesson at Parguito. Lunch at Tasca de Cocody: empanadas de cazon. Mercado de Conejeros for crafts. Porlamar nightlife.','Playa Parguito',110,8,'Taxi','Surf ~$25-40/hr. Tasca de Cocody: empanadas ~$2-3 each, famous locally.'),
          s('s4c','demo-4',3,0,'La Restinga Mangroves + La Asuncion','Kayak through mangrove tunnels, spot flamingos and pelicans. Beach at the end. Afternoon at Castillo de Santa Rosa fortress. Sunset dinner at El Fondeadero in Juan Griego.','La Restinga',100,8,'Taxi','Boat tour ~$15-20pp. Kayak ~$10/hr. Juan Griego sunset is legendary. El Fondeadero: fish ~$10-15.'),
          s('s4d','demo-4',4,0,'El Yaque Kitesurfing + Macanao','Morning kite lesson at El Yaque (world-famous). Lunch at Yaque Motion. Drive to Macanao Peninsula: wild desert, abandoned beaches. Ceviche at Boca del Rio.','Playa El Yaque',150,8,'Rental car','Kite lesson ~$50-80 for 3hrs. Macanao is rural and beautiful. Boca del Rio ceviche ~$6-8.'),
          s('s4e','demo-4',5,0,'Isla de Coche + Departure','Boat to Isla de Coche (30 min ferry). Pristine beaches, snorkeling. Lunch at fisherman\'s shack: fried snapper with arroz con coco. Duty-free shopping in Porlamar.','Isla de Coche',100,7,undefined,'Coche ferry ~$10pp. Much quieter than Margarita. Duty-free: rum, chocolate.'),
        ]},
      { ...demoBase, id: 'demo-5', user_id: 'u1', title: 'Morrocoy: Venezuela\'s Secret Caribbean Cayos', description: 'Boat-hop between deserted islands from Chichiriviche, snorkel coral gardens at Cayo Borracho, watch flamingos at Cuare Wildlife Refuge. Budget-friendly paradise.', cover_image_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800', total_days: 3, estimated_cost_usd: 320, regions: ['Morrocoy'], tags: ['beach', 'budget', 'nature'], likes: 178, saves: 312, views: 2400, is_influencer_pick: true, recommendation_count: 490, user: { full_name: 'Valentina Rojas', avatar_url: null, role: 'creator' },
        stops: [
          s('s5a','demo-5',1,0,'Arrive Chichiriviche + Cayo Sombrero','Drive from Caracas (3.5hrs). Check into Posada La Montanita (~$30-40/night). Penero boat to Cayo Sombrero: white sand, palm trees, turquoise water. Lunch at a palapa. Dinner at Restaurant Miramar.','Cayo Sombrero',100,7,'Penero boat','Penero ~$10-15pp roundtrip. Cayo Sombrero has basic food stalls.'),
          s('s5b','demo-5',2,0,'Cayo Borracho + Playuela','Cayo Borracho: spectacular reef snorkeling, fewer people. Then Playuela/Playa Azul. Afternoon at Cayo Sal. Dinner at El Ancla: pargo rojo, arroz con coco.','Cayo Borracho',80,8,'Penero boat','Best reef for snorkeling in Morrocoy. Bring your own snorkel gear. El Ancla: fish plates ~$8-10.'),
          s('s5c','demo-5',3,0,'Cuare Wildlife Refuge + Departure','Morning boat tour: mangrove channels, flamingos, scarlet ibis, pelicans. Final swim at Cayo Muerto. Lunch at a highway parador: cachapas con queso de mano. Drive back.','Cuare Wildlife Refuge',60,5,undefined,'Cuare tour ~$15-20pp, best early morning. Flamingos best Dec-Apr. Very budget-friendly overall.'),
        ]},
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
