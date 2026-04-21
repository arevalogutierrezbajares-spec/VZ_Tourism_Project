import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { MapPin, Calendar, DollarSign, Tag } from 'lucide-react';
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

export default async function ItineraryPage({ params }: Props) {
  const { id } = await params;

  let itinerary = null;
  let discountDisplay: { code: string; label: string } | null = null;

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

  if (!itinerary || !itinerary.is_public) notFound();

  const it = itinerary as Itinerary;
  const stops = (itinerary.stops || []).sort((a: { day: number; order: number }, b: { day: number; order: number }) => a.day - b.day || a.order - b.order);
  const totalDays = it.total_days || 1;

  return (
    <div className="container px-4 py-8 max-w-3xl mx-auto">
      <Suspense fallback={null}>
        <ReferralTracker itineraryId={it.id} />
      </Suspense>

      {/* Header */}
      <div className="mb-6 space-y-3">
        <h1 className="text-3xl font-bold">{it.title}</h1>
        {it.description && (
          <p className="text-muted-foreground text-lg">{it.description}</p>
        )}

        {/* Author */}
        {it.user && (
          <div className="flex items-center gap-2">
            <Avatar className="w-7 h-7">
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
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {totalDays} day{totalDays !== 1 ? 's' : ''}
          </span>
          {it.start_date && (
            <span>{formatDate(it.start_date)}</span>
          )}
          {it.estimated_cost_usd > 0 && (
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" />
              From {formatCurrency(it.estimated_cost_usd)}
            </span>
          )}
          {it.regions.length > 0 && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {it.regions.join(', ')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <ReactionBar likes={it.likes} saves={it.saves} className="-ml-2" />
          <ShareButton title={it.title} />
        </div>

        {/* Discount code callout — shown when creator attached an active code */}
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

      {/* Days */}
      <div className="space-y-8">
        {Array.from({ length: totalDays }).map((_, dayIdx) => {
          const day = dayIdx + 1;
          const dayStops = stops.filter((s: { day: number }) => s.day === day);

          return (
            <div key={day} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center">
                  {day}
                </div>
                <h2 className="font-bold text-lg">Day {day}</h2>
              </div>
              <div className="ml-4 border-l-2 border-muted pl-4 space-y-3">
                {dayStops.map((stop: Parameters<typeof ItineraryStopCard>[0]['stop']) => (
                  <ItineraryStopCard key={stop.id} stop={stop} />
                ))}
                {dayStops.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No stops planned for this day</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
