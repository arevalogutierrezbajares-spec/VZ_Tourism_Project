import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listingSchema } from '@/lib/validators';
import { slugify } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const category = searchParams.get('category');
  const region = searchParams.get('region');
  const minPrice = searchParams.get('min_price');
  const maxPrice = searchParams.get('max_price');
  const search = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  let query = supabase
    .from('listings')
    .select('*, provider:providers(business_name, is_verified)', { count: 'exact' })
    .eq('is_published', true)
    .order('rating', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) query = query.eq('category', category);
  if (region) query = query.eq('region', region);
  if (minPrice) query = query.gte('price_usd', parseFloat(minPrice));
  if (maxPrice) query = query.lte('price_usd', parseFloat(maxPrice));
  if (search) query = query.ilike('title', `%${search}%`);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, count, offset, limit });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: provider } = await supabase.from('providers').select('id').eq('user_id', user.id).single();
  if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 403 });

  const body = await request.json();
  const parsed = listingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const slug = `${slugify(parsed.data.title)}-${Date.now().toString(36)}`;
  const { data, error } = await supabase
    .from('listings')
    .insert({ ...parsed.data, provider_id: provider.id, slug })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
