import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
  return NextResponse.json({ bookings: data ?? [] });
}
