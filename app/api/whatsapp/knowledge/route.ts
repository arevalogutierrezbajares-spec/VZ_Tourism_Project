import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProvider } from '@/lib/whatsapp/dev-auth';
import type { PosadaKnowledge } from '@/types/database';

/**
 * GET /api/whatsapp/knowledge
 * Returns the posada knowledge base for the authenticated provider.
 */
export async function GET() {
  const auth = await getAuthenticatedProvider();
  if (!auth.ok) return auth.response;
  const { supabase, providerId } = auth;

  const { data, error } = await supabase
    .from('posada_knowledge')
    .select('*')
    .eq('provider_id', providerId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? null });
}

/**
 * PUT /api/whatsapp/knowledge
 * Upserts the knowledge base. Accepts partial updates — only supplied fields are overwritten.
 */
export async function PUT(request: NextRequest) {
  const auth = await getAuthenticatedProvider();
  if (!auth.ok) return auth.response;
  const { supabase, providerId } = auth;

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
    .upsert({ provider_id: providerId, ...updates }, { onConflict: 'provider_id' })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
