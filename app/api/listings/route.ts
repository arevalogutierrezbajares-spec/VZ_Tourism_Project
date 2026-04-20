// v3-supabase-primary
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, createClient } from '@/lib/supabase/server';
import { listingSchema } from '@/lib/validators';
import { slugify } from '@/lib/utils';
import { searchListings, countListings, mapTypeToCategory } from '@/lib/local-listings';
import { getAvailability, getRoomTypes } from '@/lib/availability-store';

function getDatesBetween(checkIn: string, checkOut: string): string[] {
  const dates: string[] = [];
  const current = new Date(checkIn + 'T00:00:00Z');
  const end = new Date(checkOut + 'T00:00:00Z');
  while (current < end) {
    dates.push(current.toISOString().split('T')[0]!);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

// Verified listings with their known amenities
const VERIFIED_AMENITIES: Record<string, string[]> = {
  '35da929e-6e02-42e1-adf2-cc61625194a6': ['wifi', 'pool', 'ac', 'parking', 'restaurant', 'hot_water', 'generator'],
};

function mapSupabaseToApiListing(l: Record<string, unknown>) {
  const id = l.id as string;
  const platformStatus = (l.platform_status as string) || 'scraped';
  const amenities = (VERIFIED_AMENITIES[id] ?? (l.amenities as string[] | null) ?? []) as string[];
  const cancellation_policy =
    platformStatus === 'founding_partner' ? 'flexible'
    : platformStatus === 'verified' ? 'moderate'
    : undefined;
  return {
    id,
    title: l.title,
    name: l.title,
    slug: l.slug,
    type: l.category,
    category: l.category,
    description: l.description,
    latitude: l.latitude,
    longitude: l.longitude,
    region: l.region,
    city: l.location_name,
    address: l.address ?? null,
    rating: l.rating,
    review_count: l.total_reviews,
    phone: l.phone ?? null,
    website: null,
    instagram_handle: l.instagram_handle ?? null,
    google_place_id: l.google_place_id ?? null,
    cover_image_url: l.cover_image_url ?? null,
    provider_id: l.provider_id ?? null,
    status: (l.is_published as boolean) ? 'published' : 'draft',
    platform_status: platformStatus,
    amenities,
    cancellation_policy,
  };
}

function mapLocalToApiListing(l: ReturnType<typeof searchListings>[0]) {
  const amenities = VERIFIED_AMENITIES[l.id] ?? [];
  const cancellation_policy =
    l.platform_status === 'founding_partner' ? 'flexible'
    : l.platform_status === 'verified' ? 'moderate'
    : undefined;
  return {
    id: l.id,
    title: l.name,
    name: l.name,
    slug: l.slug,
    type: l.type,
    category: mapTypeToCategory(l.type),
    description: l.description,
    latitude: l.latitude,
    longitude: l.longitude,
    region: l.region,
    city: l.city ?? (l.region ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    address: (l as unknown as Record<string, unknown>).address as string | null ?? null,
    rating: l.avg_rating,
    review_count: l.review_count,
    phone: l.phone,
    website: l.website,
    instagram_handle: l.instagram_handle,
    google_place_id: l.google_place_id,
    cover_image_url: (l as unknown as Record<string, unknown>).cover_image_url as string | null ?? null,
    provider_id: l.provider_id,
    status: l.status,
    platform_status: l.platform_status || 'scraped',
    amenities,
    cancellation_policy,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const type = searchParams.get('type') || undefined;
  const category = searchParams.get('category') || undefined;
  const region = searchParams.get('region') || undefined;
  const search = searchParams.get('q') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 2000);
  const offset = parseInt(searchParams.get('offset') || '0');
  const checkIn = searchParams.get('check_in') || undefined;
  const checkOut = searchParams.get('check_out') || undefined;
  const guests = parseInt(searchParams.get('guests') || '2');
  const amenitiesParam = searchParams.get('amenities') || '';
  const amenityFilter = amenitiesParam ? amenitiesParam.split(',').filter(Boolean) : [];
  const minPrice = searchParams.get('min_price') ? Number(searchParams.get('min_price')) : undefined;
  const maxPrice = searchParams.get('max_price') ? Number(searchParams.get('max_price')) : undefined;

  const datesSelected = !!(checkIn && checkOut && checkIn < checkOut);

  // Map explore-page filter values → actual DB category column values
  const CATEGORY_MAP: Record<string, string> = {
    hotel: 'accommodation',
    restaurant: 'gastronomy',
    experience: 'adventure',
  };
  const dbCategory = category ? (CATEGORY_MAP[category] ?? category) : undefined;

  // --- Supabase path (non-date-filtered) ---
  if (!datesSelected) {
    try {
      const supabase = await createServiceClient();
      if (supabase) {
        let query = supabase
          .from('listings')
          .select('*', { count: 'exact' })
          .eq('is_published', true)
          .order('platform_status', { ascending: false })  // founding_partner > verified > scraped
          .order('rating', { ascending: false })
          .order('id', { ascending: true })               // stable tiebreaker — prevents page-boundary duplicates
          .range(offset, offset + limit - 1);

        if (region) query = query.eq('region', region);
        if (search) {
          const s = search.replace(/[%_,()\\]/g, '\\$&');
          query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%,location_name.ilike.%${s}%`);
        }
        if (dbCategory) query = query.eq('category', dbCategory);
        else if (type) query = query.eq('category', mapTypeToCategory(type));
        if (minPrice !== undefined && !isNaN(minPrice)) query = query.gte('price_usd', minPrice);
        if (maxPrice !== undefined && !isNaN(maxPrice)) query = query.lte('price_usd', maxPrice);

        const { data, count, error } = await query;

        if (!error && data) {
          let items = (data as unknown as Record<string, unknown>[]).map(mapSupabaseToApiListing);

          if (amenityFilter.length > 0) {
            const withAmenities = items.filter((l) =>
              l.amenities.length > 0 && amenityFilter.every((a) => l.amenities.includes(a))
            );
            const without = items.filter(
              (l) => !(l.amenities.length > 0 && amenityFilter.every((a) => l.amenities.includes(a)))
            );
            items = [...withAmenities, ...without];
          }

          return NextResponse.json({ data: items, count, offset, limit, source: 'supabase' });
        }
      }
    } catch {
      // Fall through to JSON fallback
    }

    // --- JSON fallback ---
    const results = searchListings(search, { region, type, category, limit, offset });
    const count = countListings(search, { region, type, category });
    let data = results.map(mapLocalToApiListing);

    if (amenityFilter.length > 0) {
      const withAmenities = data.filter((l) =>
        l.amenities.length > 0 && amenityFilter.every((a) => l.amenities.includes(a))
      );
      const without = data.filter(
        (l) => !(l.amenities.length > 0 && amenityFilter.every((a) => l.amenities.includes(a)))
      );
      data = [...withAmenities, ...without];
    }

    return NextResponse.json({ data, count, offset, limit, source: 'json' });
  }

  // --- Date-filtered path (uses local store for availability) ---
  // Load all matching listings via Supabase if available, else JSON
  let allMatching: ReturnType<typeof searchListings> = [];
  let useSupabaseSource = false;

  try {
    const supabase = await createServiceClient();
    if (supabase) {
      let query = supabase
        .from('listings')
        .select('*')
        .eq('is_published', true)
        .limit(10000);

      if (region) query = query.eq('region', region);
      if (search) {
        const s = search.replace(/[%_,()\\]/g, '\\$&');
        query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%`);
      }
      if (dbCategory) query = query.eq('category', dbCategory);
      else if (type) query = query.eq('category', mapTypeToCategory(type));

      const { data, error } = await query;
      if (!error && data) {
        // Coerce Supabase rows to local listing shape for the availability logic below
        allMatching = (data as unknown as Record<string, unknown>[]).map((l) => ({
          id: l.id as string,
          name: l.title as string,
          slug: l.slug as string,
          type: l.category as string,
          category: l.category as string,
          description: l.description as string,
          latitude: Number(l.latitude),
          longitude: Number(l.longitude),
          region: l.region as string,
          city: l.location_name as string,
          avg_rating: l.rating as number,
          review_count: l.total_reviews as number,
          phone: l.phone as string,
          website: null,
          instagram_handle: l.instagram_handle as string,
          google_place_id: l.google_place_id as string,
          cover_image_url: l.cover_image_url as string,
          provider_id: l.provider_id as string | null,
          status: (l.is_published as boolean) ? 'published' : 'draft',
          platform_status: l.platform_status as string || 'scraped',
        })) as unknown as ReturnType<typeof searchListings>;
        useSupabaseSource = true;
      }
    }
  } catch {
    // Fall through
  }

  if (!useSupabaseSource) {
    allMatching = searchListings(search, { region, type, category, limit: 10000, offset: 0 });
  }

  const nights = getDatesBetween(checkIn!, checkOut!);

  type AvailStatus = 'available' | 'unknown';
  const availMap = new Map<string, AvailStatus>();
  const priceMap = new Map<string, { per_night: number | null; total: number | null; rooms_left: number | null }>();

  const filtered = allMatching.filter((l) => {
    const isVerified = l.platform_status === 'verified' || l.platform_status === 'founding_partner';
    if (isVerified) {
      // Check availability for this specific listing over the requested nights
      const entries = getAvailability(l.id, checkIn!, checkOut!);
      const hasBlocked = entries.some(
        (e) => (!e.is_available || e.booking_id) && nights.includes(e.date)
      );
      if (hasBlocked) return false;
      availMap.set(l.id, 'available');
      const roomTypes = getRoomTypes(l.id);
      let perNight: number | null = null;
      let roomsLeft: number | null = null;
      if (roomTypes.length > 0) {
        const eligible = roomTypes.filter((r) => r.max_guests >= guests);
        if (eligible.length > 0) {
          perNight = Math.min(...eligible.map((r) => r.base_price));
          roomsLeft = eligible.reduce((sum, r) => sum + r.count, 0);
        }
      }
      priceMap.set(l.id, { per_night: perNight, total: perNight != null ? perNight * nights.length : null, rooms_left: roomsLeft });
      return true;
    } else {
      availMap.set(l.id, 'unknown');
      return true;
    }
  });

  const totalFiltered = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);
  const availableCount = [...availMap.values()].filter((v) => v === 'available').length;
  const unknownCount = [...availMap.values()].filter((v) => v === 'unknown').length;

  const data = paginated.map((l) => {
    const amenities = VERIFIED_AMENITIES[l.id] ?? [];
    const cancellation_policy =
      l.platform_status === 'founding_partner' ? 'flexible'
      : l.platform_status === 'verified' ? 'moderate'
      : undefined;
    return {
      id: l.id,
      title: l.name,
      name: l.name,
      slug: l.slug,
      type: l.type,
      category: mapTypeToCategory(l.type),
      description: l.description,
      latitude: l.latitude,
      longitude: l.longitude,
      region: l.region,
      city: l.city ?? (l.region ?? '').replace(/_/g, ' ').replace(/\w/g, (c) => c.toUpperCase()),
      address: (l as unknown as Record<string, unknown>).address as string | null ?? null,
      rating: l.avg_rating,
      review_count: l.review_count,
      phone: l.phone,
      website: l.website,
      instagram_handle: l.instagram_handle,
      google_place_id: l.google_place_id,
      cover_image_url: (l as unknown as Record<string, unknown>).cover_image_url as string | null ?? null,
      provider_id: l.provider_id,
      status: l.status,
      platform_status: l.platform_status || 'scraped',
      amenities,
      cancellation_policy,
      availability: availMap.get(l.id) ?? 'unknown',
      price_per_night: priceMap.get(l.id)?.per_night ?? null,
      price_total: priceMap.get(l.id)?.total ?? null,
      rooms_left: priceMap.get(l.id)?.rooms_left ?? null,
    };
  });

  return NextResponse.json({
    data,
    count: totalFiltered,
    offset,
    limit,
    source: useSupabaseSource ? 'supabase' : 'json',
    filters_applied: {
      check_in: checkIn,
      check_out: checkOut,
      nights: nights.length,
      guests,
      available_count: availableCount,
      unknown_count: unknownCount,
      total: availableCount + unknownCount,
    },
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
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
