import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface CreatorContext {
  userId: string;
  creatorId: string;
  discountCodesEnabled: boolean;
}

/**
 * Shared auth guard for all /creator/* routes and protected API endpoints.
 *
 * Returns a CreatorContext on success, or a NextResponse error that should be
 * returned immediately from the route handler.
 *
 * Usage:
 *   const result = await requireCreator(request);
 *   if (result instanceof NextResponse) return result;
 *   const { userId, creatorId } = result;
 */
export async function requireCreator(
  request: NextRequest
): Promise<CreatorContext | NextResponse> {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: creator, error: creatorError } = await supabase
    .from('creator_profiles')
    .select('id, discount_codes_enabled')
    .eq('user_id', user.id)
    .single();

  if (creatorError || !creator) {
    return NextResponse.json({ error: 'Creator profile not found' }, { status: 403 });
  }

  return {
    userId: user.id,
    creatorId: creator.id,
    discountCodesEnabled: creator.discount_codes_enabled ?? false,
  };
}
