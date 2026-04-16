/**
 * Shared tool call handlers for Claude tourism tools.
 * Used by: suggest-stops, fill-itinerary, conversation, and search routes.
 */

import { createServiceClient } from '@/lib/supabase/server';
import { searchListings, mapTypeToCategory } from '@/lib/local-listings';

type EmitFn = ((payload: unknown) => void) | null;

/**
 * Handle a Claude tool call against the listings DB.
 * Tries Supabase first, falls back to local JSON.
 *
 * @param name - tool name from Claude's response
 * @param input - tool input parameters
 * @param emit - optional SSE emit function for streaming routes
 */
export async function handleToolCall(
  name: string,
  input: Record<string, unknown>,
  emit: EmitFn = null
): Promise<unknown> {
  switch (name) {
    case 'search_listings':
      return handleSearchListings(input, emit);
    case 'get_safety_info':
      return handleGetSafetyInfo(input);
    case 'check_availability':
      return handleCheckAvailability(input);
    case 'calculate_cost':
      return handleCalculateCost(input);
    case 'get_route':
      return { message: 'Route calculation requires Mapbox API — available in the interactive map' };
    default:
      return { message: `Tool ${name} not implemented` };
  }
}

async function handleSearchListings(
  input: Record<string, unknown>,
  emit: EmitFn
): Promise<unknown> {
  const query = (input.query as string) || (input.region as string) || '';
  const region = (input.region as string) || undefined;
  const type = (input.category as string) || undefined;
  const limit = (input.limit as number) || 10;

  let listings: Record<string, unknown>[] = [];

  // Try Supabase first
  try {
    const supabase = await createServiceClient();
    if (supabase) {
      let q = supabase
        .from('listings')
        .select(
          'id, title, description, short_description, category, region, location_name, latitude, longitude, price_usd, duration_hours, rating, cover_image_url'
        )
        .eq('is_published', true)
        .limit(limit);

      if (region) q = q.ilike('region', `%${region}%`);
      if (type) q = q.eq('category', type);
      if (query)
        q = q.or(
          `title.ilike.%${query}%,description.ilike.%${query}%`
        );
      if (input.min_price) q = q.gte('price_usd', input.min_price);
      if (input.max_price) q = q.lte('price_usd', input.max_price);
      if (input.safety_level) q = q.eq('safety_level', input.safety_level);

      const { data } = await q.order('rating', { ascending: false });
      if (data?.length) {
        listings = data;
      }
    }
  } catch {
    // Fall through to local
  }

  // Fallback to local JSON
  if (listings.length === 0) {
    const scraped = searchListings(query, { region, type, limit });
    listings = scraped.map((l) => ({
      id: l.id,
      title: l.name,
      name: l.name,
      slug: l.slug,
      type: l.type,
      category: mapTypeToCategory(l.type),
      latitude: l.latitude,
      longitude: l.longitude,
      rating: l.avg_rating,
      review_count: l.review_count,
      region: l.region,
      description: l.description?.slice(0, 200),
    }));
  }

  // Emit to frontend if streaming
  if (emit && listings.length > 0) {
    emit({ type: 'listings', data: listings });
  }

  return { listings, count: listings.length };
}

async function handleGetSafetyInfo(
  input: Record<string, unknown>
): Promise<unknown> {
  try {
    const supabase = await createServiceClient();
    if (supabase) {
      const { data } = await supabase
        .from('safety_zones')
        .select('name, level, description, tips')
        .ilike('region', `%${input.region}%`)
        .limit(5);
      return { zones: data || [], region: input.region };
    }
  } catch {
    // ignore
  }
  return { zones: [], region: input.region };
}

async function handleCheckAvailability(
  input: Record<string, unknown>
): Promise<unknown> {
  try {
    const supabase = await createServiceClient();
    if (!supabase) return { unavailable_dates: [], is_available: true };

    const { data } = await supabase
      .from('availability')
      .select('*')
      .eq('listing_id', input.listing_id as string)
      .gte('date', input.date as string)
      .eq('is_available', false);
    return { unavailable_dates: data || [], is_available: !data?.length };
  } catch {
    return { unavailable_dates: [], is_available: true };
  }
}

async function handleCalculateCost(
  input: Record<string, unknown>
): Promise<unknown> {
  const listingIds = input.listing_ids as string[];
  if (!listingIds?.length) return { total: 0, per_person: 0 };

  try {
    const supabase = await createServiceClient();
    if (!supabase) return { total: 0, per_person: 0 };

    const { data } = await supabase
      .from('listings')
      .select('id, title, price_usd')
      .in('id', listingIds);

    const total = (data || []).reduce(
      (sum, l) => sum + (Number(l.price_usd) || 0),
      0
    );
    const guests = Number(input.guests) || 1;
    return { listings: data, total, per_person: total / guests };
  } catch {
    return { total: 0, per_person: 0 };
  }
}
