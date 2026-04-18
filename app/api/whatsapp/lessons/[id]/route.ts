import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { embedText } from '@/lib/whatsapp-rag';

const PatchSchema = z.object({
  question_text: z.string().min(1).max(2000).optional(),
  answer_text: z.string().min(1).max(4000).optional(),
  context_tags: z.array(z.string().max(50)).max(20).optional(),
  approved: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function getProvider(supabase: Awaited<ReturnType<typeof createClient>>) {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('providers')
    .select('id')
    .eq('user_id', user.id)
    .single();
  return data ?? null;
}

// ─── PATCH: update a lesson ───────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const supabase = await createClient();
  const provider = await getProvider(supabase);
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const svc = await createServiceClient();
  if (!svc) return NextResponse.json({ error: 'DB unavailable' }, { status: 500 });

  // Verify ownership
  const { data: existing } = await svc
    .from('wa_lessons')
    .select('id')
    .eq('id', id)
    .eq('provider_id', provider.id)
    .single();

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (parsed.data.question_text !== undefined) updates.question_text = parsed.data.question_text;
  if (parsed.data.answer_text !== undefined) updates.answer_text = parsed.data.answer_text;
  if (parsed.data.context_tags !== undefined) updates.context_tags = parsed.data.context_tags;
  if (parsed.data.approved !== undefined) updates.approved = parsed.data.approved;

  // Re-generate embedding when question text changes
  if (parsed.data.question_text) {
    const newEmbedding = await embedText(parsed.data.question_text);
    updates.question_embedding = newEmbedding ?? null;
  }

  const { data, error } = await svc
    .from('wa_lessons')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ lesson: data });
}

// ─── DELETE: remove a lesson ──────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const supabase = await createClient();
  const provider = await getProvider(supabase);
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const svc = await createServiceClient();
  if (!svc) return NextResponse.json({ error: 'DB unavailable' }, { status: 500 });

  const { error } = await svc
    .from('wa_lessons')
    .delete()
    .eq('id', id)
    .eq('provider_id', provider.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
