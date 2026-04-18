import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/whatsapp/hitl-count
 * Returns the number of conversations requiring provider attention.
 * Used by the sidebar badge in real time via Supabase subscription.
 */
export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ count: 0 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ count: 0 });

  const { data: provider } = await supabase
    .from('providers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!provider) return NextResponse.json({ count: 0 });

  // Count escalated conversations that need provider action.
  // 'escalated' = AI flagged uncertainty or sentiment trigger, provider hasn't resolved.
  // 'human'     = provider took over and is actively handling.
  const { count } = await supabase
    .from('wa_conversations')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', provider.id)
    .in('status', ['escalated', 'human']);

  return NextResponse.json({ count: count ?? 0 });
}
