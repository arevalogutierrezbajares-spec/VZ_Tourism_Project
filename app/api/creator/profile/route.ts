import { NextRequest, NextResponse } from 'next/server';
import { requireCreator } from '@/lib/auth/require-creator';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateSchema = z.object({
  display_name: z.string().min(2).max(60).optional(),
  bio: z.string().max(150).optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Username may only contain lowercase letters, numbers, and underscores.')
    .optional(),
  instagram_handle: z.string().max(50).nullable().optional(),
  tiktok_handle: z.string().max(50).nullable().optional(),
  youtube_handle: z.string().max(50).nullable().optional(),
  website_url: z.string().url().max(200).nullable().optional(),
  niche_tags: z.array(z.string()).max(3).optional(),
  location: z.string().max(100).nullable().optional(),
});

// PATCH /api/creator/profile
// Used by the onboarding wizard (and later by profile edit).
export async function PATCH(req: NextRequest) {
  const ctx = await requireCreator(req);
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });

  // If username is being set, check uniqueness (exclude this creator's own row)
  if (parsed.data.username) {
    const { data: existing } = await supabase
      .from('creator_profiles')
      .select('id')
      .eq('username', parsed.data.username)
      .neq('id', ctx.creatorId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Username is already taken.' }, { status: 409 });
    }
  }

  const { error } = await supabase
    .from('creator_profiles')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', ctx.creatorId);

  if (error) {
    return NextResponse.json({ error: 'Could not update profile.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// GET /api/creator/profile — return the current creator's profile
export async function GET(req: NextRequest) {
  const ctx = await requireCreator(req);
  if (ctx instanceof NextResponse) return ctx;

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });

  const { data, error } = await supabase
    .from('creator_profiles')
    .select('*')
    .eq('id', ctx.creatorId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
  }

  return NextResponse.json(data);
}
