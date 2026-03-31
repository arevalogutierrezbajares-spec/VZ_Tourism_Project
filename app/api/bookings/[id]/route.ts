import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface Params { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('bookings')
    .select('*, listing:listings(title, cover_image_url, slug, provider:providers(business_name, phone, whatsapp)), tourist:users(full_name, email)')
    .eq('id', id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  const { data: booking } = await supabase
    .from('bookings')
    .select('tourist_id, listing_id')
    .eq('id', id)
    .single();

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Check authorization
  if (profile?.role === 'tourist' && booking.tourist_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (profile?.role === 'provider') {
    const { data: provider } = await supabase.from('providers').select('id').eq('user_id', user.id).single();
    const { data: listing } = await supabase.from('listings').select('provider_id').eq('id', booking.listing_id).single();
    if (!provider || listing?.provider_id !== provider.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const body = await request.json();
  const allowedFields = ['status', 'notes', 'special_requests'];
  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await supabase
    .from('bookings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
