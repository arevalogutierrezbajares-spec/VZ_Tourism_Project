import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createCodeSchema = z.object({
  code: z.string().regex(/^[A-Z0-9]{3,15}$/, 'Code must be 3-15 uppercase letters/numbers'),
  type: z.enum(['percentage', 'fixed']),
  value: z.number().positive(),
  min_booking_usd: z.number().min(0).optional().default(0),
  max_uses: z.number().int().positive().nullable().optional(),
  expires_at: z.string().nullable().optional(),
  listing_ids: z.array(z.string().uuid()).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get creator profile + check discount_codes_enabled
  const { data: profile } = await supabase
    .from('creator_profiles')
    .select('id, discount_codes_enabled')
    .eq('user_id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'Creator profile not found' }, { status: 403 });
  if (!profile.discount_codes_enabled) {
    return NextResponse.json({ error: 'Discount codes not enabled for your account' }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('discount_codes')
    .insert({ ...parsed.data, creator_id: profile.id })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Code already taken' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('creator_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!profile) return NextResponse.json({ error: 'Creator profile not found' }, { status: 403 });

  const { data, error } = await supabase
    .from('discount_codes')
    .select('*')
    .eq('creator_id', profile.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
