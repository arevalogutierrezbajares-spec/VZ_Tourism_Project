import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getBooking, updateBookingStatus, type BookingStatus } from '@/lib/bookings-store';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;

  // Try Supabase first
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('guest_bookings')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) return NextResponse.json({ data });
      if (error?.code !== 'PGRST116') console.error('Supabase GET booking error:', error);
    } catch (err) {
      console.error('Supabase GET booking exception:', err);
    }
  }

  // JSON fallback
  const booking = getBooking(id);
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: booking });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { status, notes, special_requests } = body as {
    status?: BookingStatus;
    notes?: string;
    special_requests?: string;
  };

  const validStatuses: BookingStatus[] = [
    'pending',
    'confirmed',
    'cancelled',
    'completed',
    'payment_submitted',
  ];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  if (special_requests !== undefined) updates.special_requests = special_requests;

  // Try Supabase first
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('guest_bookings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return NextResponse.json({ data });
      if (error?.code !== 'PGRST116') console.error('Supabase PATCH booking error:', error);
    } catch (err) {
      console.error('Supabase PATCH booking exception:', err);
    }
  }

  // JSON fallback
  const booking = getBooking(id);
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const extraUpdates: Partial<typeof booking> = {};
  if (notes !== undefined) extraUpdates.notes = notes;
  if (special_requests !== undefined) extraUpdates.special_requests = special_requests;

  const updated = updateBookingStatus(id, status ?? booking.status, extraUpdates);
  return NextResponse.json({ data: updated });
}
