import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface Params { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // YYYY-MM

  let query = supabase
    .from('availability')
    .select('*')
    .eq('listing_id', id)
    .order('date', { ascending: true });

  if (month) {
    const start = `${month}-01`;
    const end = `${month}-31`;
    query = query.gte('date', start).lte('date', end);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: provider } = await supabase.from('providers').select('id').eq('user_id', user.id).single();
  const { data: listing } = await supabase.from('listings').select('provider_id').eq('id', id).single();

  if (!provider || !listing || provider.id !== listing.provider_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { date, is_available, max_guests, price_override } = body;

  const { data, error } = await supabase
    .from('availability')
    .upsert(
      { listing_id: id, date, is_available, max_guests, price_override },
      { onConflict: 'listing_id,date' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
