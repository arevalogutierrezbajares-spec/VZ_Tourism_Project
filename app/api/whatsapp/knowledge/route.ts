import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProvider } from '@/lib/whatsapp/dev-auth';
import { KnowledgeUpdateSchema } from '@/lib/whatsapp/schemas';
import { rateLimit } from '@/lib/api/rate-limit';

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
    console.error('[whatsapp/knowledge] GET error:', error.message);
    return NextResponse.json({ error: 'Failed to load knowledge base' }, { status: 500 });
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

  const rateLimitRes = await rateLimit(`api:${providerId}`, 20);
  if (rateLimitRes) return rateLimitRes;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = KnowledgeUpdateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }
  const updates = parsed.data;

  const { data, error } = await supabase
    .from('posada_knowledge')
    .upsert({ provider_id: providerId, ...updates }, { onConflict: 'provider_id' })
    .select('*')
    .single();

  if (error) {
    console.error('[whatsapp/knowledge] PUT error:', error.message);
    return NextResponse.json({ error: 'Failed to save knowledge base' }, { status: 500 });
  }

  return NextResponse.json({ data });
}
