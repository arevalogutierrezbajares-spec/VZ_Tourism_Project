import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { listingSchema } from '@/lib/validators';
import { getAllListings, mapTypeToCategory } from '@/lib/local-listings';

interface Params { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    // Try Supabase first (service client bypasses RLS — matches the list endpoint)
    const supabase = await createServiceClient();
    if (supabase) {
      const { data } = await supabase
        .from('listings')
        .select('*, provider:providers(business_name, is_verified), photos:listing_photos(*)')
        .eq('id', id)
        .single();

      if (data) return NextResponse.json({ data });
    }

    // Fall back to local scraped data
    const local = getAllListings().find((l) => l.id === id);
    if (local) {
      return NextResponse.json({
        data: {
          id: local.id,
          title: local.name,
          slug: local.slug,
          description: local.description,
          short_description: local.description?.slice(0, 200),
          category: mapTypeToCategory(local.type),
          type: local.type,
          region: local.region,
          city: local.city,
          address: local.address,
          rating: local.avg_rating,
          review_count: local.review_count,
          cover_image_url: local.cover_image_url,
          phone: local.phone,
          website: local.website,
          instagram_handle: local.instagram_handle,
          platform_status: local.platform_status ?? 'scraped',
          amenities: local.category_tags ?? [],
          photos: local.cover_image_url ? [{ url: local.cover_image_url }] : [],
        },
      });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    console.error('[listings GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    const { data: listing } = await supabase.from('listings').select('provider_id').eq('id', id).single();

    if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (profile?.role !== 'admin') {
      const { data: provider } = await supabase.from('providers').select('id').eq('user_id', user.id).single();
      if (!provider || provider.id !== listing.provider_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await request.json();
    const parsed = listingSchema.partial().safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { data, error } = await supabase
      .from('listings')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[listings PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: listing } = await supabase.from('listings').select('provider_id').eq('id', id).single();
    if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: provider } = await supabase.from('providers').select('id').eq('user_id', user.id).single();
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();

    if (profile?.role !== 'admin' && provider?.id !== listing.provider_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase.from('listings').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[listings DELETE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
