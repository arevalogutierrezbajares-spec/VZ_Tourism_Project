import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const codesParam = searchParams.get('codes') || searchParams.get('code');
  if (!codesParam) return NextResponse.json({ error: 'codes param required' }, { status: 400 });

  const codes = codesParam.split(',').map(c => c.trim().toUpperCase()).filter(Boolean).slice(0, 5);

  const { data } = await supabase
    .from('discount_codes')
    .select('code')
    .in('code', codes);

  const taken = new Set((data ?? []).map(r => r.code));
  const results = codes.map(code => ({ code, available: !taken.has(code) }));

  return NextResponse.json({ results });
}
