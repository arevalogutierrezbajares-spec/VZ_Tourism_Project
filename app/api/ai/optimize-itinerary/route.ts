import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';
import { CLAUDE_MODEL, SYSTEM_PROMPT } from '@/lib/claude/client';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
  }

  const body = await request.json();
  const { itineraryId } = body;

  if (!itineraryId) return NextResponse.json({ error: 'itineraryId is required' }, { status: 400 });

  const { data: itinerary } = await supabase
    .from('itineraries')
    .select('*, stops:itinerary_stops(*, listing:listings(title, category, location_city, price_usd, duration_hours))')
    .eq('id', itineraryId)
    .eq('user_id', user.id)
    .single();

  if (!itinerary) return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `Please optimize this ${itinerary.total_days}-day Venezuela travel itinerary for logical flow, minimize travel time between stops, and suggest any improvements:

${JSON.stringify(itinerary, null, 2)}

Provide:
1. Reordering suggestions (which stops to move to which days)
2. Travel time estimates between stops
3. Pacing advice
4. Any missing experiences worth adding
5. Cost optimization tips`;

  try {
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content.find((c) => c.type === 'text')?.text || '';
    return NextResponse.json({ optimization: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Optimization failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
