import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { bookingSchema } from '@/lib/validators';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();

  let query = supabase
    .from('bookings')
    .select('*, listing:listings(title, cover_image_url, slug), tourist:users(full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (profile?.role === 'tourist') {
    query = query.eq('tourist_id', user.id);
  } else if (profile?.role === 'provider') {
    const { data: provider } = await supabase.from('providers').select('id').eq('user_id', user.id).single();
    const { data: listings } = await supabase.from('listings').select('id').eq('provider_id', provider?.id || '');
    const listingIds = listings?.map((l) => l.id) || [];
    query = query.in('listing_id', listingIds);
  }

  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, count, offset, limit });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Check availability
  const { data: listing } = await supabase
    .from('listings')
    .select('price_usd, is_published')
    .eq('id', parsed.data.listing_id)
    .single();

  if (!listing || !listing.is_published) {
    return NextResponse.json({ error: 'Listing not available' }, { status: 404 });
  }

  const guests = parsed.data.guests || 1;
  const checkIn = new Date(parsed.data.check_in);
  const checkOut = parsed.data.check_out ? new Date(parsed.data.check_out) : checkIn;
  const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
  const total_usd = listing.price_usd * guests * nights;

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      ...parsed.data,
      tourist_id: user.id,
      total_usd,
      status: 'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
