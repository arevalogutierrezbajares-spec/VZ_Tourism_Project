import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createPayout, getPayouts, type PayoutMethod } from '@/lib/payouts-store';
import { getAllBookings } from '@/lib/bookings-store';
import { requireAdminAuth } from '@/lib/admin-auth';
import { createClient } from '@/lib/supabase/server';

const INSTANT_PAYOUT_FEE_RATE = 0.015; // 1.5%

const createPayoutSchema = z.object({
  provider_id: z.string().min(1),
  method: z.enum(['zelle', 'usdt', 'binance', 'bank']),
  method_details: z.record(z.string(), z.string()),
  instant: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  let provider_id = searchParams.get('provider_id');

  // If provider_id not supplied, derive from the authenticated Supabase session
  if (!provider_id) {
    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: provider } = await supabase
      .from('providers')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    provider_id = provider.id as string;
  }

  const payouts = getPayouts(provider_id);
  const sorted = [...payouts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Compute pending balance from confirmed bookings
  const bookings = getAllBookings();
  const pendingBalance = bookings
    .filter((b) => b.provider_id === provider_id && b.status === 'confirmed')
    .reduce((sum, b) => sum + b.net_provider_usd, 0);

  return NextResponse.json({ data: sorted, pending_balance: pendingBalance });
}

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createPayoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { provider_id, method, method_details, instant } = parsed.data;

  // Calculate pending balance
  const bookings = getAllBookings();
  const pendingBookings = bookings.filter(
    (b) => b.provider_id === provider_id && b.status === 'confirmed'
  );
  const grossAmount = pendingBookings.reduce((sum, b) => sum + b.net_provider_usd, 0);

  if (grossAmount <= 0) {
    return NextResponse.json({ error: 'No pending balance to pay out' }, { status: 400 });
  }

  const feeUsd = instant ? Math.round(grossAmount * INSTANT_PAYOUT_FEE_RATE * 100) / 100 : 0;
  const netAmount = Math.round((grossAmount - feeUsd) * 100) / 100;

  const payout = createPayout({
    provider_id,
    amount_usd: grossAmount,
    fee_usd: feeUsd,
    net_amount: netAmount,
    method: method as PayoutMethod,
    method_details,
    status: instant ? 'processing' : 'pending',
  });

  return NextResponse.json({ data: payout }, { status: 201 });
}
