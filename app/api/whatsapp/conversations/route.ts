import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/whatsapp/conversations
 * Returns paginated conversations for the authenticated provider.
 * Query params: status, booking_stage, page, limit
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: provider } = await supabase
    .from('providers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const status        = searchParams.get('status');
  const bookingStage  = searchParams.get('booking_stage');
  const page          = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit         = Math.min(50, parseInt(searchParams.get('limit') ?? '25', 10));
  const offset        = (page - 1) * limit;

  let query = supabase
    .from('wa_conversations')
    .select('*', { count: 'exact' })
    .eq('provider_id', provider.id)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (bookingStage) query = query.eq('booking_stage', bookingStage);

  const { data, count, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    page,
    limit,
    hasMore: offset + limit < (count ?? 0),
  });
}
