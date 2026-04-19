import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type { DiscountValidationResult } from '@/types/database';

const validateSchema = z.object({
  code: z.string(),
  booking_total_usd: z.number().positive(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = validateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { code, booking_total_usd } = parsed.data;
  const normalizedCode = code.toUpperCase().trim();

  const supabase = await createServiceClient();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const { data: discountCode, error } = await supabase
    .from('discount_codes')
    .select('id, creator_id, type, value, min_booking_usd, max_uses, times_used, expires_at, status')
    .eq('code', normalizedCode)
    .single();

  if (error || !discountCode) {
    return NextResponse.json<DiscountValidationResult>({
      valid: false, code_id: '', creator_id: '', discount_amount_usd: 0,
      net_total_usd: booking_total_usd, error: 'Invalid code',
    }, { status: 404 });
  }

  if (discountCode.status !== 'active') {
    return NextResponse.json<DiscountValidationResult>({
      valid: false, code_id: discountCode.id, creator_id: discountCode.creator_id,
      discount_amount_usd: 0, net_total_usd: booking_total_usd,
      error: discountCode.status === 'paused' ? 'Code is paused' : 'Code has expired',
    }, { status: 410 });
  }

  if (discountCode.expires_at && new Date(discountCode.expires_at) < new Date()) {
    return NextResponse.json<DiscountValidationResult>({
      valid: false, code_id: discountCode.id, creator_id: discountCode.creator_id,
      discount_amount_usd: 0, net_total_usd: booking_total_usd, error: 'Code has expired',
    }, { status: 410 });
  }

  if (booking_total_usd < discountCode.min_booking_usd) {
    return NextResponse.json<DiscountValidationResult>({
      valid: false, code_id: discountCode.id, creator_id: discountCode.creator_id,
      discount_amount_usd: 0, net_total_usd: booking_total_usd,
      error: `Minimum booking of $${discountCode.min_booking_usd} required`,
    }, { status: 422 });
  }

  if (discountCode.max_uses !== null && discountCode.times_used >= discountCode.max_uses) {
    return NextResponse.json<DiscountValidationResult>({
      valid: false, code_id: discountCode.id, creator_id: discountCode.creator_id,
      discount_amount_usd: 0, net_total_usd: booking_total_usd, error: 'Code has reached its usage limit',
    }, { status: 410 });
  }

  // Calculate discount
  let discount_amount_usd: number;
  if (discountCode.type === 'percentage') {
    discount_amount_usd = Math.round(booking_total_usd * (discountCode.value / 100) * 100) / 100;
  } else {
    discount_amount_usd = Math.min(discountCode.value, booking_total_usd);
  }

  const net_total_usd = Math.max(0, Math.round((booking_total_usd - discount_amount_usd) * 100) / 100);

  return NextResponse.json<DiscountValidationResult>({
    valid: true,
    code_id: discountCode.id,
    creator_id: discountCode.creator_id,
    discount_amount_usd,
    net_total_usd,
  });
}
