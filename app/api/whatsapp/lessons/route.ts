import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { embedText } from '@/lib/whatsapp-rag';

const CreateSchema = z.object({
  question_text: z.string().min(1).max(2000),
  answer_text: z.string().min(1).max(4000),
  context_tags: z.array(z.string().max(50)).max(20).default([]),
  source: z.enum(['hitl_correction', 'historical_import', 'manual']).default('manual'),
  conversation_id: z.string().uuid().optional(),
});

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

// ─── GET: list all lessons for this provider ──────────────────────────────

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const provider = await getProvider(supabase);
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const approved = searchParams.get('approved');

  let query = supabase!
    .from('wa_lessons')
    .select('*')
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: false });

  if (approved !== null) {
    query = query.eq('approved', approved === 'true');
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ lessons: data ?? [] });
}

// ─── POST: create a new lesson ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const provider = await getProvider(supabase);
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const svc = await createServiceClient();
  if (!svc) return NextResponse.json({ error: 'DB unavailable' }, { status: 500 });

  // Generate embedding for the question (non-blocking on failure — lesson is saved regardless)
  const embedding = await embedText(parsed.data.question_text);

  const { data, error } = await svc
    .from('wa_lessons')
    .insert({
      provider_id: provider.id,
      question_text: parsed.data.question_text,
      answer_text: parsed.data.answer_text,
      context_tags: parsed.data.context_tags,
      source: parsed.data.source,
      conversation_id: parsed.data.conversation_id ?? null,
      approved: true,
      question_embedding: embedding ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ lesson: data }, { status: 201 });
}
