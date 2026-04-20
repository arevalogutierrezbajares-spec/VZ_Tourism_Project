import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Require authentication for an API route handler.
 * Returns the authenticated user or a 401 NextResponse.
 */
export async function requireAuth() {
  const supabase = await createClient();
  if (!supabase) {
    return { error: NextResponse.json({ error: 'Service unavailable' }, { status: 503 }) };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { user, supabase };
}

/**
 * Require admin role for an API route handler.
 * Returns the authenticated admin user or a 401/403 NextResponse.
 */
export async function requireAdmin() {
  const result = await requireAuth();
  if ('error' in result) return result;

  const { user, supabase } = result;

  // Check user role in the database
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user, supabase };
}
