import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_LEVELS = ['green', 'yellow', 'orange', 'red'];

export async function GET() {
  try {
    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    const { data, error } = await supabase
      .from('safety_zones')
      .select('*')
      .order('level');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { name, description, level, tips, polygon } = body;

    if (!name || !description || !level) {
      return NextResponse.json({ error: 'name, description, and level are required' }, { status: 400 });
    }

    if (!VALID_LEVELS.includes(level)) {
      return NextResponse.json(
        { error: `Invalid level. Must be one of: ${VALID_LEVELS.join(', ')}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('safety_zones')
      .insert({ name, description, level, tips: tips || [], polygon: polygon || null })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
