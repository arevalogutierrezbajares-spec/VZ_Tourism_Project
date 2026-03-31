import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { providerSchema } from '@/lib/validators';

interface Params { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('providers')
    .select('*, user:users(full_name, avatar_url, created_at)')
    .eq('id', id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();

  if (profile?.role !== 'admin') {
    const { data: provider } = await supabase.from('providers').select('id').eq('user_id', user.id).single();
    if (!provider || provider.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const body = await request.json();
  const parsed = providerSchema.partial().safeParse(body);
  // Also allow admin to set is_verified
  const updates = parsed.success ? parsed.data : {};
  if (profile?.role === 'admin' && 'is_verified' in body) {
    (updates as Record<string, unknown>).is_verified = body.is_verified;
  }

  const { data, error } = await supabase
    .from('providers')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
