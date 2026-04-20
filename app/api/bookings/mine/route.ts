import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Lazy-load scraped listings for cover image + phone enrichment
let _listings: Record<string, string | null>[] | null = null;
async function getListings(): Promise<Record<string, string | null>[]> {
  if (_listings) return _listings;
  try {
    const mod = await import('@/data/scraped-listings.json');
    _listings = (mod.default ?? mod) as unknown as Record<string, string | null>[];
  } catch {
    _listings = [];
  }
  return _listings;
}

async function enrichBooking(booking: Record<string, unknown>) {
  const listings = await getListings();
  const listing = listings.find(
    (l) => l.id === booking.listing_id || l.slug === booking.listing_slug
  );
  return {
    ...booking,
    cover_image_url: booking.cover_image_url ?? listing?.cover_image_url ?? null,
    provider_phone: listing?.phone ?? null,
  };
}

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const email = user.email;
  if (!email) return NextResponse.json({ bookings: [] });

  const { data, error } = await supabase
    .from('guest_bookings')
    .select('*')
    .eq('guest_email', email)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const bookings = await Promise.all((data ?? []).map(enrichBooking));
  return NextResponse.json({ bookings });
}
