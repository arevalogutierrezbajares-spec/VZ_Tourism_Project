import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireCreator } from '@/lib/auth/require-creator';
import { z } from 'zod';

const stopSchema = z.object({
  extracted_name: z.string(),
  resolved_listing_id: z.string().uuid().nullable(),
  day: z.number().int().positive().default(1),
  order: z.number().int().min(0),
  description: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  source_url: z.string().url(),
  video_embed_url: z.string().nullable().optional(),
  thumbnail_url: z.string().nullable().optional(),
});

const publishSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  is_public: z.boolean().default(true),
  referral_code: z.string().max(20).nullable().optional(),
  creator_text: z.string().max(1000).nullable().optional(),
  tags: z.array(z.string()).max(10).default([]),
  stops: z.array(stopSchema).min(1).max(50),
});

/**
 * POST /api/creator/itineraries/publish
 *
 * One-shot: creates the itinerary + all stops in a single transaction.
 * Creator-only — requires active Supabase session with a creator_profiles row.
 */
export async function POST(request: NextRequest) {
  // Auth guard
  const auth = await requireCreator(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = publishSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { stops, creator_text, ...itineraryData } = parsed.data;

  // 1. Create the itinerary
  const { data: itinerary, error: itineraryError } = await supabase
    .from('itineraries')
    .insert({
      ...itineraryData,
      user_id: userId,
      creation_method: 'social_import',
      creator_text: creator_text ?? null,
      total_days: Math.max(...stops.map((s) => s.day), 1),
    })
    .select('id, slug')
    .single();

  if (itineraryError || !itinerary) {
    console.error('Itinerary insert error:', itineraryError);
    return NextResponse.json({ error: itineraryError?.message || 'Failed to create itinerary' }, { status: 500 });
  }

  // 2. Insert all stops
  const stopRows = stops.map((stop, idx) => ({
    itinerary_id: itinerary.id,
    listing_id: stop.resolved_listing_id ?? null,
    day: stop.day,
    order: stop.order ?? idx,
    title: stop.extracted_name,
    description: stop.description ?? null,
    location_name: stop.extracted_name,
    latitude: stop.latitude ?? null,
    longitude: stop.longitude ?? null,
    cost_usd: 0,
    duration_hours: null,
    start_time: null,
    end_time: null,
    transport_to_next: null,
    transport_duration_minutes: null,
    notes: null,
    source_url: stop.source_url,
    source_type: 'social_import' as const,
    video_embed_url: stop.video_embed_url ?? null,
  }));

  const { error: stopsError } = await supabase.from('itinerary_stops').insert(stopRows);

  if (stopsError) {
    // Roll back: delete the itinerary
    await supabase.from('itineraries').delete().eq('id', itinerary.id);
    console.error('Stops insert error:', stopsError);
    return NextResponse.json({ error: 'Failed to save itinerary stops' }, { status: 500 });
  }

  return NextResponse.json({ itinerary_id: itinerary.id, slug: itinerary.slug }, { status: 201 });
}
