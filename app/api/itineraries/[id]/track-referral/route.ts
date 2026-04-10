import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createHash } from 'crypto';

interface Params { params: Promise<{ id: string }> }

function hashIP(ip: string): string {
  return createHash('sha256').update(ip + 'vz-referral-salt').digest('hex').slice(0, 16);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const referralCode = body.referral_code;
  if (!referralCode || typeof referralCode !== 'string') {
    return NextResponse.json({ error: 'referral_code is required' }, { status: 400 });
  }

  // Verify itinerary exists and has this referral code
  const { data: itinerary } = await supabase
    .from('itineraries')
    .select('id, referral_code, user_id')
    .eq('id', id)
    .eq('referral_code', referralCode)
    .single();

  if (!itinerary) {
    return NextResponse.json({ error: 'Invalid itinerary or referral code' }, { status: 404 });
  }

  // Find the creator profile for the itinerary owner
  const { data: creator } = await supabase
    .from('creator_profiles')
    .select('id')
    .eq('user_id', itinerary.user_id)
    .single();

  if (!creator) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  // Hash the client IP for dedup
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : '0.0.0.0';
  const ipHash = hashIP(ip);

  // Insert with dedup (ON CONFLICT DO NOTHING via unique constraint)
  await supabase
    .from('itinerary_referrals')
    .insert({
      itinerary_id: id,
      creator_id: creator.id,
      referral_code: referralCode,
      ip_hash: ipHash,
    });

  // Increment views on the itinerary
  const { error: rpcError } = await supabase.rpc('increment_views', { row_id: id });
  if (rpcError) {
    // If RPC doesn't exist, do a manual update
    await supabase
      .from('itineraries')
      .update({ views: ((itinerary as unknown as Record<string, unknown>).views as number || 0) + 1 })
      .eq('id', id);
  }

  return NextResponse.json({ tracked: true });
}
