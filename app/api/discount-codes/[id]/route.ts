import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateSchema = z.object({
  status: z.enum(['active', 'paused']).optional(),
  max_uses: z.number().int().positive().nullable().optional(),
  expires_at: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('creator_profiles').select('id').eq('user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Not a creator' }, { status: 403 });

  // Verify ownership
  const { data: existing } = await supabase
    .from('discount_codes').select('id, creator_id').eq('id', id).single();
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.creator_id !== profile.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { data, error } = await supabase
    .from('discount_codes')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('creator_profiles').select('id').eq('user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Not a creator' }, { status: 403 });

  const { data: existing } = await supabase
    .from('discount_codes').select('id, creator_id, times_used').eq('id', id).single();
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.creator_id !== profile.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Soft-delete if already used, hard-delete if never used
  if (existing.times_used > 0) {
    await supabase.from('discount_codes').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', id);
  } else {
    await supabase.from('discount_codes').delete().eq('id', id);
  }

  return NextResponse.json({ deleted: true });
}
