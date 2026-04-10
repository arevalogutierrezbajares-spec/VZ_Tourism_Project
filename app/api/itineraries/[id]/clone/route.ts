import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface Params { params: Promise<{ id: string }> }

const MAX_CLONES_PER_HOUR = 5;

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Rate limit: count clones in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentClones } = await supabase
    .from('itineraries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', oneHourAgo);

  if ((recentClones || 0) >= MAX_CLONES_PER_HOUR) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429 }
    );
  }

  // Fetch original itinerary + stops
  const { data: original } = await supabase
    .from('itineraries')
    .select('*, stops:itinerary_stops(*)')
    .eq('id', id)
    .eq('is_public', true)
    .single();

  if (!original) {
    return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 });
  }

  // Clone the itinerary
  const { data: cloned, error: cloneError } = await supabase
    .from('itineraries')
    .insert({
      user_id: user.id,
      title: `${original.title} (copy)`,
      description: original.description,
      cover_image_url: original.cover_image_url,
      is_public: false,
      is_template: false,
      is_influencer_pick: false,
      total_days: original.total_days,
      estimated_cost_usd: original.estimated_cost_usd,
      regions: original.regions,
      tags: original.tags,
      likes: 0,
      saves: 0,
      views: 0,
      referral_code: null,
    })
    .select()
    .single();

  if (cloneError || !cloned) {
    return NextResponse.json({ error: cloneError?.message || 'Clone failed' }, { status: 500 });
  }

  // Clone all stops
  const stops = original.stops || [];
  if (stops.length > 0) {
    const clonedStops = stops.map((stop: Record<string, unknown>) => ({
      itinerary_id: cloned.id,
      listing_id: stop.listing_id,
      day: stop.day,
      order: stop.order,
      title: stop.title,
      description: stop.description,
      latitude: stop.latitude,
      longitude: stop.longitude,
      location_name: stop.location_name,
      start_time: stop.start_time,
      end_time: stop.end_time,
      duration_hours: stop.duration_hours,
      cost_usd: stop.cost_usd,
      transport_to_next: stop.transport_to_next,
      transport_duration_minutes: stop.transport_duration_minutes,
      notes: stop.notes,
    }));

    await supabase.from('itinerary_stops').insert(clonedStops);
  }

  return NextResponse.json({ id: cloned.id }, { status: 201 });
}
