import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    const { searchParams } = new URL(request.url);
    const verified = searchParams.get('verified');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('providers')
      .select('*, user:users(full_name, avatar_url)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (verified === 'true') query = query.eq('is_verified', true);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data, count });
  } catch (err) {
    console.error('[providers GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
