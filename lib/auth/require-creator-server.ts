import { createClient } from '@/lib/supabase/server';
import type { CreatorContext } from './require-creator';

/**
 * Server Component version of requireCreator.
 * Returns CreatorContext or null (caller handles the redirect).
 * Cannot return NextResponse — use this in page.tsx server components.
 */
export async function requireCreatorServer(): Promise<CreatorContext | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data: creator, error: creatorError } = await supabase
    .from('creator_profiles')
    .select('id, discount_codes_enabled')
    .eq('user_id', user.id)
    .single();

  if (creatorError || !creator) return null;

  return {
    userId: user.id,
    creatorId: creator.id,
    discountCodesEnabled: creator.discount_codes_enabled ?? false,
  };
}
