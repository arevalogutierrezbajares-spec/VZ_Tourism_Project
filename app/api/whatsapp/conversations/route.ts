import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProvider } from '@/lib/whatsapp/dev-auth';

/**
 * GET /api/whatsapp/conversations
 * Returns paginated conversations for the authenticated provider.
 * Query params: status, booking_stage, page, limit
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedProvider();
  if (!auth.ok) return auth.response;
  const { supabase, providerId } = auth;

  const { searchParams } = new URL(request.url);
  const status        = searchParams.get('status');
  const bookingStage  = searchParams.get('booking_stage');
  const page          = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit         = Math.min(50, parseInt(searchParams.get('limit') ?? '25', 10));
  const offset        = (page - 1) * limit;

  let query = supabase
    .from('wa_conversations')
    .select('*', { count: 'exact' })
    .eq('provider_id', providerId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (bookingStage) query = query.eq('booking_stage', bookingStage);

  const { data, count, error } = await query;

  if (error) {
    console.error('[whatsapp/conversations] GET error:', error.message);
    return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 });
  }

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    page,
    limit,
    hasMore: offset + limit < (count ?? 0),
  });
}
