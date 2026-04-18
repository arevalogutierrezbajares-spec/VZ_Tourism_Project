import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, createClient } from '@/lib/supabase/server';
import {
  getPlaceDetails,
  getPhotoUrl,
  mapPlaceTypeToCategory,
  extractRegion,
} from '@/lib/google-places';
import { slugify } from '@/lib/utils';

/**
 * POST /api/places/resolve
 *
 * Given a google_place_id, either finds an existing listing or creates a new one
 * from Google Places data. Requires authentication for creation.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { google_place_id } = body as { google_place_id: string };

  if (!google_place_id) {
    return NextResponse.json(
      { error: 'google_place_id is required' },
      { status: 400 }
    );
  }

  // Require authentication — creating listings from Google Places needs a user
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Check if a listing with this google_place_id already exists
  const serviceClient = await createServiceClient();
  if (!serviceClient) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  const { data: existing } = await serviceClient
    .from('listings')
    .select('*')
    .eq('google_place_id', google_place_id)
    .single();

  if (existing) {
    return NextResponse.json({ listing: existing, created: false });
  }

  // Fetch full details from Google Places
  let details;
  try {
    details = await getPlaceDetails(google_place_id);
  } catch (error) {
    console.error('Google Places details error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch place details' },
      { status: 502 }
    );
  }

  // Build the listing from Google Places data
  const name = details.displayName?.text || 'Unknown Place';
  const slug = `${slugify(name)}-${Date.now().toString(36)}`;
  const category = mapPlaceTypeToCategory(details.types || []);
  const region = extractRegion(details.addressComponents);
  const coverPhoto = details.photos?.[0]
    ? getPhotoUrl(details.photos[0].name)
    : null;

  const editorialDesc = details.editorialSummary?.text || '';
  const description = editorialDesc || `${name} — ${details.formattedAddress || ''}`;

  const newListing = {
    title: name,
    slug,
    description,
    short_description: description.slice(0, 200),
    category,
    region,
    location_name: name,
    latitude: details.location?.latitude,
    longitude: details.location?.longitude,
    address: details.formattedAddress || null,
    google_place_id,
    phone: details.internationalPhoneNumber || null,
    rating: details.rating || 0,
    total_reviews: details.userRatingCount || 0,
    cover_image_url: coverPhoto,
    is_published: true,
    platform_status: 'scraped',
    source: 'google_places',
    added_by_user_id: user.id,
    price_usd: 0,
  };

  const { data: created, error } = await serviceClient
    .from('listings')
    .insert(newListing)
    .select()
    .single();

  if (error) {
    console.error('Failed to create listing from Google Place:', error);
    return NextResponse.json(
      { error: 'Failed to create listing' },
      { status: 500 }
    );
  }

  return NextResponse.json({ listing: created, created: true });
}
