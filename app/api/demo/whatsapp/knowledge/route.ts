import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import type { PosadaKnowledge } from '@/types/database';

// Demo API — uses service client + hardcoded test provider.
// Only used by /demo/whatsapp/brain — not exposed to real users.
const DEMO_PROVIDER_ID = '7d78c3cc-0097-4866-a345-d5d1c7783050';

export async function GET() {
  const supabase = await createServiceClient();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  const { data, error } = await supabase
    .from('posada_knowledge')
    .select('*')
    .eq('provider_id', DEMO_PROVIDER_ID)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? null });
}

export async function PUT(request: NextRequest) {
  // Only allow in development or with DEMO_SECRET header
  const isDev = process.env.NODE_ENV === 'development';
  const demoSecret = process.env.DEMO_SECRET;
  const authHeader = request.headers.get('x-demo-secret');

  if (!isDev && (!demoSecret || authHeader !== demoSecret)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = await createServiceClient();
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });

  let body: Partial<Omit<PosadaKnowledge, 'id' | 'provider_id' | 'created_at' | 'updated_at'>>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const allowed: (keyof typeof body)[] = [
    'property_description', 'location_details', 'room_types', 'amenities',
    'policies', 'faqs', 'booking_process', 'payment_methods',
    'nearby_attractions', 'languages_spoken', 'special_notes', 'pricing_rules',
  ];

  const updates = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k as keyof typeof body))
  );

  const { data, error } = await supabase
    .from('posada_knowledge')
    .upsert({ provider_id: DEMO_PROVIDER_ID, ...updates }, { onConflict: 'provider_id' })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
