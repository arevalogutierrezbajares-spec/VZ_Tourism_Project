import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { itinerarySchema } from '@/lib/validators';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  const { searchParams } = new URL(request.url);
  const mine = searchParams.get('mine') === 'true';
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');
  const region = searchParams.get('region');
  const durationMin = searchParams.get('duration_min');
  const durationMax = searchParams.get('duration_max');
  const budgetMin = searchParams.get('budget_min');
  const budgetMax = searchParams.get('budget_max');
  const sort = searchParams.get('sort') || 'popular';
  const influencerPicks = searchParams.get('influencer_picks') === 'true';

  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from('itineraries')
    .select('*, user:users(full_name, avatar_url, role)', { count: 'exact' })
    .range(offset, offset + limit - 1);

  if (mine && user) {
    query = query.eq('user_id', user.id);
  } else {
    query = query.eq('is_public', true);
  }

  if (influencerPicks) {
    query = query.eq('is_influencer_pick', true);
  }
  if (region) {
    query = query.contains('regions', [region]);
  }
  if (durationMin) {
    query = query.gte('total_days', parseInt(durationMin));
  }
  if (durationMax) {
    query = query.lte('total_days', parseInt(durationMax));
  }
  if (budgetMin) {
    query = query.gte('estimated_cost_usd', parseFloat(budgetMin));
  }
  if (budgetMax) {
    query = query.lte('estimated_cost_usd', parseFloat(budgetMax));
  }

  if (sort === 'newest') {
    query = query.order('created_at', { ascending: false });
  } else if (sort === 'price') {
    query = query.order('estimated_cost_usd', { ascending: true });
  } else {
    // popular: sort by saves + likes descending
    query = query.order('saves', { ascending: false });
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Compute recommendation_count on read
  const enriched = (data || []).map((item: Record<string, unknown>) => ({
    ...item,
    recommendation_count: ((item.saves as number) || 0) + ((item.likes as number) || 0),
  }));

  return NextResponse.json({ data: enriched, count });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = itinerarySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await supabase
    .from('itineraries')
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
