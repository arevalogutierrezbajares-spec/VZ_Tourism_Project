import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  parseWhatsAppExport,
  detectProviderName,
  buildConversationPairs,
  extractLessonsAndTone,
} from '@/lib/whatsapp-import';
import { embedText } from '@/lib/whatsapp-rag';

// Allow up to 10MB imports and 5 minutes processing
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: provider } = await supabase
    .from('providers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });

  // ─── Parse FormData ───────────────────────────────────────────────

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const providerNameHint = (formData.get('provider_name') as string | null) ?? '';

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!file.name.endsWith('.txt')) {
    return NextResponse.json({ error: 'File must be a .txt WhatsApp export' }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
  }

  // ─── Parse & extract ──────────────────────────────────────────────

  const text = await file.text();
  const turns = parseWhatsAppExport(text);

  if (turns.length < 5) {
    return NextResponse.json(
      { error: 'Could not parse this file. Make sure it is an unmodified WhatsApp chat export (.txt).' },
      { status: 422 }
    );
  }

  const providerName = detectProviderName(turns, providerNameHint);
  const pairs = buildConversationPairs(turns, providerName);

  if (pairs.length === 0) {
    return NextResponse.json(
      { error: 'No conversation pairs found. Try specifying the exact name you use in WhatsApp.' },
      { status: 422 }
    );
  }

  const providerTurns = turns.filter((t) => t.sender === providerName);
  const { lessons, tone_profile } = await extractLessonsAndTone(pairs, providerTurns);

  if (lessons.length === 0) {
    return NextResponse.json(
      { error: 'No useful Q&A pairs could be extracted from this conversation.' },
      { status: 422 }
    );
  }

  // ─── Embed + store lessons ────────────────────────────────────────

  const svc = await createServiceClient();
  if (!svc) return NextResponse.json({ error: 'DB unavailable' }, { status: 500 });

  // Embed all questions concurrently (batched to avoid rate limits)
  const EMBED_BATCH = 10;
  const embeddings: (number[] | null)[] = new Array(lessons.length).fill(null);

  for (let i = 0; i < lessons.length; i += EMBED_BATCH) {
    const batch = lessons.slice(i, i + EMBED_BATCH);
    const results = await Promise.all(batch.map((l) => embedText(l.question_text)));
    results.forEach((emb, j) => { embeddings[i + j] = emb; });
  }

  // Skip duplicates against ALL existing lessons for this provider (any source)
  const { data: existingLessons } = await svc
    .from('wa_lessons')
    .select('question_text')
    .eq('provider_id', provider.id);

  const existingQuestions = new Set(
    (existingLessons ?? []).map((l: { question_text: string }) =>
      l.question_text.toLowerCase().trim().slice(0, 80)
    )
  );

  const newLessons = lessons.filter((l) => {
    const key = l.question_text.toLowerCase().trim().slice(0, 80);
    return !existingQuestions.has(key);
  });

  // Pre-build a Map so we can look up each lesson's embedding in O(1) instead of O(n) indexOf
  const embeddingByLesson = new Map(lessons.map((l, i) => [l, embeddings[i]]));

  let storedCount = 0;
  if (newLessons.length > 0) {
    const rows = newLessons.map((lesson) => ({
      provider_id: provider.id,
      question_text: lesson.question_text,
      answer_text: lesson.answer_text,
      context_tags: lesson.context_tags,
      source: 'historical_import' as const,
      approved: true,
      question_embedding: embeddingByLesson.get(lesson) ?? null,
    }));

    const { data: inserted, error } = await svc
      .from('wa_lessons')
      .insert(rows)
      .select('id');

    if (!error) storedCount = inserted?.length ?? 0;
  }

  // ─── Update posada_knowledge ──────────────────────────────────────

  const importRecord = {
    filename: file.name,
    imported_at: new Date().toISOString(),
    qa_pairs_count: storedCount,
    provider_name_detected: providerName,
    status: 'complete',
  };

  const { data: existingKnowledge } = await svc
    .from('posada_knowledge')
    .select('id, training_imports, tone_profile')
    .eq('provider_id', provider.id)
    .maybeSingle();

  if (existingKnowledge) {
    const updates: Record<string, unknown> = {
      training_imports: [
        ...(existingKnowledge.training_imports ?? []),
        importRecord,
      ],
    };
    // Only overwrite tone profile if we extracted one and don't have one yet
    if (tone_profile && !existingKnowledge.tone_profile) {
      updates.tone_profile = tone_profile;
    }
    await svc.from('posada_knowledge').update(updates).eq('id', existingKnowledge.id);
  } else {
    await svc.from('posada_knowledge').insert({
      provider_id: provider.id,
      tone_profile: tone_profile ?? null,
      training_imports: [importRecord],
    });
  }

  return NextResponse.json({
    ok: true,
    turns_parsed: turns.length,
    pairs_found: pairs.length,
    lessons_extracted: lessons.length,
    lessons_stored: storedCount,
    lessons_skipped: lessons.length - newLessons.length,
    provider_name_detected: providerName,
    tone_profile_extracted: tone_profile !== null,
  });
}
