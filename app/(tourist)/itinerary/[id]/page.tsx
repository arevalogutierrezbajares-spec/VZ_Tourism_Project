import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { MapPin, Calendar, DollarSign, Tag, Compass, MessageSquare, CalendarCheck } from 'lucide-react';
import { ShareButton } from '@/components/itinerary/ShareButton';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { ItineraryStopCard } from '@/components/itinerary/ItineraryStopCard';
import { ReferralTracker } from '@/components/itinerary/ReferralTracker';
import { BookActions } from '@/components/itinerary/BookActions';
import { ReactionBar } from '@/components/social/ReactionBar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDate, formatCurrency, getInitials } from '@/lib/utils';
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

const PLAN_STEPS = [
  {
    icon: Compass,
    title: 'Explore',
    description: 'Browse curated stops and local gems',
    gradient: 'from-primary/70 to-primary',
  },
  {
    icon: MessageSquare,
    title: 'Plan with AI',
    description: 'Chat to customize your perfect trip',
    gradient: 'from-accent/70 to-accent',
  },
  {
    icon: CalendarCheck,
    title: 'Book',
    description: 'Reserve directly with verified partners',
    gradient: 'from-secondary/70 to-secondary',
  },
];

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

  // Use demo data for design preview
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

        // If itinerary has a referral_code, look up the discount details for display
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
  const stops = (itinerary.stops || []).sort((a: { day: number; order: number }, b: { day: number; order: number }) => a.day - b.day || a.order - b.order);
  const totalDays = it.total_days || 1;

  return (
    <div className="container px-4 py-8 max-w-4xl mx-auto">
      <Suspense fallback={null}>
        <ReferralTracker itineraryId={it.id} />
      </Suspense>

      {/* Header card */}
      <div className="rounded-2xl border bg-background shadow-sm p-6 sm:p-8 mb-8">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-balance">{it.title}</h1>
          {it.description && (
            <p className="text-muted-foreground text-lg text-pretty">{it.description}</p>
          )}

          {/* Author */}
          {it.user && (
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={it.user.avatar_url || undefined} alt={`${it.user.full_name}'s avatar`} />
                <AvatarFallback className="text-xs">{getInitials(it.user.full_name)}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">by</span>
              <span className="text-sm font-medium">{it.user.full_name}</span>
              {it.user.role === 'creator' && (
                <Badge variant="secondary" className="text-xs bg-status-pending/10 text-status-pending border-status-pending/20">Creator</Badge>
              )}
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
              <Calendar className="w-4 h-4" />
              {totalDays} day{totalDays !== 1 ? 's' : ''}
            </span>
            {it.start_date && (
              <span className="bg-muted/50 px-3 py-1.5 rounded-full">{formatDate(it.start_date)}</span>
            )}
            {it.estimated_cost_usd > 0 && (
              <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
                <DollarSign className="w-4 h-4" />
                From {formatCurrency(it.estimated_cost_usd)}
              </span>
            )}
            {it.regions.length > 0 && (
              <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
                <MapPin className="w-4 h-4" />
                {it.regions.join(', ')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <ReactionBar likes={it.likes} saves={it.saves} className="-ml-2" />
            <ShareButton title={it.title} />
          </div>

          {/* Discount code callout */}
          {discountDisplay && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-status-pending/10 border border-status-pending/20">
              <Tag className="w-4 h-4 text-status-pending flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-foreground">
                  Use code{' '}
                  <span className="font-mono font-bold">{discountDisplay.code}</span>
                  {' '}for <span className="font-semibold">{discountDisplay.label}</span> on any booking from this itinerary
                </span>
              </div>
              <Badge variant="outline" className="text-xs border-status-pending/40 text-status-pending flex-shrink-0">
                {discountDisplay.label}
              </Badge>
            </div>
          )}

          {/* Book CTA */}
          <BookActions itineraryId={it.id} itineraryTitle={it.title} />
        </div>
      </div>

      {/* 3-step "How to plan" card */}
      <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-primary/5 p-6 mb-8">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Want your own trip?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLAN_STEPS.map((step, idx) => (
            <div key={step.title} className="relative flex flex-col items-center text-center p-4 rounded-xl bg-background border shadow-sm hover:shadow-md motion-safe:hover:-translate-y-0.5 transition-[box-shadow,transform] duration-200">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center mb-3 shadow-sm`}>
                <step.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium text-muted-foreground mb-1">Step {idx + 1}</span>
              <h4 className="font-semibold text-sm">{step.title}</h4>
              <p className="text-xs text-muted-foreground mt-1 text-pretty">{step.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <Link
            href="/plan"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Compass className="w-4 h-4" />
            Start Planning
          </Link>
        </div>
      </div>

      {/* Days */}
      <div className="space-y-6">
        {Array.from({ length: totalDays }).map((_, dayIdx) => {
          const day = dayIdx + 1;
          const dayStops = stops.filter((s: { day: number }) => s.day === day);

          return (
            <div key={day} className="rounded-2xl border bg-background shadow-sm overflow-hidden">
              {/* Day header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b bg-muted/30">
                <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-sm">
                  {day}
                </div>
                <h2 className="font-bold text-lg">Day {day}</h2>
                <span className="text-xs text-muted-foreground ml-auto">
                  {dayStops.length} {dayStops.length === 1 ? 'stop' : 'stops'}
                </span>
              </div>

              {/* Stops */}
              <div className="p-4 space-y-3">
                {dayStops.map((stop: Parameters<typeof ItineraryStopCard>[0]['stop']) => (
                  <ItineraryStopCard key={stop.id} stop={stop} showPhoto />
                ))}
                {dayStops.length === 0 && (
                  <p className="text-sm text-muted-foreground italic py-4 text-center">No stops planned for this day</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
