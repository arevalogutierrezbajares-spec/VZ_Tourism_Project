import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listingSchema } from '@/lib/validators';
import { slugify } from '@/lib/utils';
import { searchListings, getTotalCount, mapTypeToCategory } from '@/lib/local-listings';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const type = searchParams.get('type') || undefined;
  const category = searchParams.get('category') || undefined;
  const region = searchParams.get('region') || undefined;
  const search = searchParams.get('q') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 2000);
  const offset = parseInt(searchParams.get('offset') || '0');

  const results = searchListings(search, { region, type, category, limit, offset });
  const count = getTotalCount(search, { region, type });

  const data = results.map((l) => ({
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
    address: l.address,
    rating: l.avg_rating,
    review_count: l.review_count,
    phone: l.phone,
    website: l.website,
    instagram_handle: l.instagram_handle,
    google_place_id: l.google_place_id,
    cover_image_url: (l as any).cover_image_url ?? null,
    provider_id: l.provider_id,
    status: l.status,
    platform_status: l.platform_status || 'scraped',
  }));

  return NextResponse.json({ data, count, offset, limit });
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
