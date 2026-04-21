import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { ReferralTracker } from '@/components/itinerary/ReferralTracker';
import { ItineraryViewPanel } from './ItineraryViewPanel';
import type { Itinerary } from '@/types/database';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const supabase = await createClient();
    if (!supabase) return { title: 'Itinerary Not Found' };
    const { data } = await supabase.from('itineraries').select('title, description').eq('id', id).single();
    if (!data) return { title: 'Itinerary Not Found' };
    return { title: data.title, description: data.description || undefined };
  } catch {
    return { title: 'Itinerary Not Found' };
  }
}

// Demo data for previewing the design
const DEMO_ITINERARY = {
  id: 'demo',
  title: 'Caracas to Los Roques — 5 Day Adventure',
  description: 'A curated journey from the vibrant capital through coastal paradise, featuring snorkeling, local cuisine, and hidden beaches.',
  user_id: 'demo-user',
  user: { id: 'demo-user', full_name: 'Maria Gonzalez', avatar_url: null, role: 'creator' as const },
  regions: ['Caracas', 'Los Roques'],
  total_days: 3,
  estimated_cost_usd: 850,
  cover_image_url: null,
  start_date: '2026-05-01',
  end_date: '2026-05-05',
  is_public: true,
  is_template: false,
  is_influencer_pick: false,
  referral_code: null,
  tags: ['beach', 'adventure', 'snorkeling'],
  saves: 24,
  likes: 67,
  views: 340,
  created_at: '2026-04-15T00:00:00Z',
  updated_at: '2026-04-15T00:00:00Z',
  stops: [
    { id: 's1', itinerary_id: 'demo', day: 1, order: 1, listing_id: 'l1', title: 'Breakfast at Cafe Arabica', description: 'Start your day with Venezuelan coffee and arepas in the heart of Altamira.', latitude: null, longitude: null, location_name: 'Altamira, Caracas', start_time: '08:00', end_time: '09:30', duration_hours: 1.5, cost_usd: 15, transport_to_next: 'Walk', transport_duration_minutes: 10, notes: 'Try the pabellon arepa', source_type: 'manual', listing: { title: 'Cafe Arabica', cover_image_url: '/hero/gastronomy.jpg', slug: 'cafe-arabica', price_usd: 15, short_description: 'Specialty coffee and traditional Venezuelan breakfast in a cozy Altamira setting.', category: 'restaurant', rating: 4.6, total_reviews: 89, tags: ['coffee', 'breakfast', 'local'] } },
    { id: 's2', itinerary_id: 'demo', day: 1, order: 2, listing_id: 'l2', title: 'Explore Parque del Este', description: 'Stroll through Caracas\' largest urban park with lake views and tropical flora.', latitude: null, longitude: null, location_name: 'Caracas', start_time: '10:00', end_time: '12:00', duration_hours: 2, cost_usd: 0, transport_to_next: 'Taxi', transport_duration_minutes: 25, notes: null, source_type: 'ai_suggested', listing: { title: 'Parque del Este', cover_image_url: '/hero/adventure.jpg', slug: 'parque-del-este', price_usd: null, short_description: 'A 82-hectare green oasis in eastern Caracas — perfect for morning walks, birdwatching, and family picnics.', category: 'experience', rating: 4.3, total_reviews: 214, tags: ['nature', 'park', 'free'] } },
    { id: 's3', itinerary_id: 'demo', day: 1, order: 3, listing_id: 'l3', title: 'Lunch at La Casa Bistro', description: null, latitude: null, longitude: null, location_name: 'Las Mercedes, Caracas', start_time: '12:30', end_time: '14:00', duration_hours: 1.5, cost_usd: 25, transport_to_next: null, transport_duration_minutes: null, notes: null, source_type: 'manual', listing: { title: 'La Casa Bistro', cover_image_url: '/hero/gastronomy.jpg', slug: 'la-casa-bistro', price_usd: 25, short_description: 'Modern Venezuelan fusion cuisine in Las Mercedes\' trendy dining district.', category: 'restaurant', rating: 4.5, total_reviews: 56, tags: ['fusion', 'lunch', 'trendy'] } },
    { id: 's4', itinerary_id: 'demo', day: 2, order: 1, listing_id: 'l4', title: 'Flight to Los Roques', description: 'Scenic 40-minute flight from Maiquetia with views of the Caribbean archipelago.', latitude: null, longitude: null, location_name: 'Los Roques Archipelago', start_time: '07:00', end_time: '08:00', duration_hours: 1, cost_usd: 180, transport_to_next: 'Boat', transport_duration_minutes: 20, notes: 'Book with Aerotuy for best window seats', source_type: 'manual', listing: { title: 'Los Roques Flight', cover_image_url: '/hero/city_skyline.jpg', slug: 'los-roques-flight', price_usd: 180, short_description: 'Direct charter flight from Caracas to the Los Roques archipelago. Stunning aerial views included.', category: 'experience', rating: 4.7, total_reviews: 320, tags: ['flight', 'scenic', 'transfer'] } },
    { id: 's5', itinerary_id: 'demo', day: 2, order: 2, listing_id: 'l5', title: 'Snorkeling at Cayo de Agua', description: 'Crystal-clear waters with coral reefs and tropical fish — one of the Caribbean\'s top spots.', latitude: null, longitude: null, location_name: 'Cayo de Agua', start_time: '10:00', end_time: '14:00', duration_hours: 4, cost_usd: 60, transport_to_next: 'Boat', transport_duration_minutes: 30, notes: null, source_type: 'ai_suggested', listing: { title: 'Cayo de Agua Snorkel Tour', cover_image_url: '/hero/adventure.jpg', slug: 'cayo-de-agua', price_usd: 60, short_description: 'Full-day snorkeling excursion to the iconic sandbar with equipment, guide, and lunch included.', category: 'experience', rating: 4.9, total_reviews: 445, tags: ['snorkeling', 'beach', 'adventure', 'guided'] } },
    { id: 's6', itinerary_id: 'demo', day: 3, order: 1, listing_id: 'l6', title: 'Sunrise at Madrisqui', description: 'Wake early for a breathtaking sunrise over turquoise waters.', latitude: null, longitude: null, location_name: 'Madrisqui Island', start_time: '06:00', end_time: '08:00', duration_hours: 2, cost_usd: 0, transport_to_next: 'Walk', transport_duration_minutes: 5, notes: null, source_type: 'manual', listing: { title: 'Madrisqui Beach', cover_image_url: '/hero/adventure.jpg', slug: 'madrisqui', price_usd: null, short_description: 'A pristine white-sand beach on a small cay — ideal for sunrise photography and solitude.', category: 'experience', rating: 4.8, total_reviews: 67, tags: ['beach', 'sunrise', 'photography'] } },
    { id: 's7', itinerary_id: 'demo', day: 3, order: 2, listing_id: 'l7', title: 'Posada Acuarela Check-in & Lunch', description: 'Charming beachfront posada with fresh seafood and hammock lounging.', latitude: null, longitude: null, location_name: 'Gran Roque', start_time: '12:00', end_time: '14:00', duration_hours: 2, cost_usd: 120, transport_to_next: null, transport_duration_minutes: null, notes: null, source_type: 'manual', listing: { title: 'Posada Acuarela', cover_image_url: '/hero/city_skyline.jpg', slug: 'posada-acuarela', price_usd: 120, short_description: 'Colorful beachfront posada in Gran Roque village with fresh-caught seafood, cozy rooms, and Caribbean charm.', category: 'hotel', rating: 4.6, total_reviews: 132, tags: ['posada', 'beachfront', 'seafood', 'boutique'] } },
  ],
};

export default async function ItineraryPage({ params }: Props) {
  const { id } = await params;

  let itinerary = null;
  let discountDisplay: { code: string; label: string } | null = null;

  if (id === 'demo') {
    itinerary = DEMO_ITINERARY;
  } else {
    try {
      const supabase = await createClient();
      if (supabase) {
        const { data } = await supabase
          .from('itineraries')
          .select('*, user:users(id, full_name, avatar_url, role), stops:itinerary_stops(*, listing:listings(title, cover_image_url, slug, price_usd))')
          .eq('id', id)
          .single();
        itinerary = data;

        if (data?.referral_code) {
          const { data: codeData } = await supabase
            .from('discount_codes')
            .select('code, type, value')
            .eq('code', data.referral_code)
            .eq('status', 'active')
            .single();
          if (codeData) {
            const label = codeData.type === 'percentage'
              ? `${codeData.value}% off`
              : `$${codeData.value} off`;
            discountDisplay = { code: codeData.code, label };
          }
        }
      }
    } catch {
      // Supabase not configured
    }
  }

  if (!itinerary || !itinerary.is_public) notFound();

  const it = itinerary as Itinerary;
  const stops = (itinerary.stops || []).sort(
    (a: { day: number; order: number }, b: { day: number; order: number }) => a.day - b.day || a.order - b.order
  );

  return (
    <>
      <Suspense fallback={null}>
        <ReferralTracker itineraryId={it.id} />
      </Suspense>
      <ItineraryViewPanel
        itinerary={{
          id: it.id,
          title: it.title,
          description: it.description,
          user: it.user || null,
          regions: it.regions,
          total_days: it.total_days,
          start_date: it.start_date,
          likes: it.likes,
          saves: it.saves,
        }}
        stops={stops}
        discountDisplay={discountDisplay}
      />
    </>
  );
}
