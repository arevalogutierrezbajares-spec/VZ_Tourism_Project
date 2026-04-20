import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: provider, error: providerError } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (providerError || !provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const { data: providerListings } = await supabase
      .from('listings')
      .select('id')
      .eq('provider_id', provider.id);

    const listingIds = providerListings?.map((l) => l.id) ?? [];

    if (listingIds.length === 0) {
      return NextResponse.json({ data: [], check_ins: [], check_outs: [] });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    const listingIdParam = searchParams.get('listing_id');

    // Build base query scoped to provider's listings
    let query = supabase
      .from('guest_bookings')
      .select('*, tourist:users!tourist_id(full_name), listing:listings!listing_id(title)')
      .in('listing_id', listingIds);

    if (listingIdParam && listingIds.includes(listingIdParam)) {
      query = query.eq('listing_id', listingIdParam);
    }

    const { data: bookings, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If a date is provided, split into check-ins and check-outs for that date
    if (dateParam) {
      const checkIns = (bookings ?? []).filter((b) => b.check_in === dateParam);
      const checkOuts = (bookings ?? []).filter((b) => b.check_out === dateParam);
      return NextResponse.json({ data: bookings ?? [], check_ins: checkIns, check_outs: checkOuts });
    }

    return NextResponse.json({ data: bookings ?? [], check_ins: [], check_outs: [] });
  } catch (err) {
    console.error('[api/provider/bookings] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
