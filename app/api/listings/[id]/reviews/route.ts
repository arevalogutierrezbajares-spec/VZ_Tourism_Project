import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { reviewSchema } from '@/lib/validators';

interface Params { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reviews')
    .select('*, user:users(full_name, avatar_url)')
    .eq('listing_id', id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = reviewSchema.safeParse({ ...body, listing_id: id });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Verify user has a completed booking for this listing
  const { data: booking } = await supabase
    .from('bookings')
    .select('id')
    .eq('listing_id', id)
    .eq('tourist_id', user.id)
    .eq('status', 'completed')
    .limit(1)
    .single();

  if (!booking) {
    return NextResponse.json({ error: 'You must complete a booking before reviewing' }, { status: 403 });
  }

  // Check for existing review
  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('listing_id', id)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'You have already reviewed this listing' }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
