import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { embedText } from '@/lib/whatsapp-rag';

/**
 * POST /api/whatsapp/lessons/embed
 *
 * Backfills embeddings for all approved lessons that have question_embedding = NULL.
 * Called after Phase 5 historical import, or to recover from any embedding failures.
 *
 * Processes in batches of 20 to stay within rate limits.
 * Returns counts: { processed, skipped, failed }
 */
export async function POST() {
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

  // Fetch all un-embedded approved lessons
  const { data: lessons, error } = await supabase
    .from('wa_lessons')
    .select('id, question_text')
    .eq('provider_id', provider.id)
    .eq('approved', true)
    .is('question_embedding', null)
    .order('created_at', { ascending: true })
    .limit(200); // cap per-request to avoid timeout

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!lessons || lessons.length === 0) {
    return NextResponse.json({ processed: 0, skipped: 0, failed: 0, message: 'All lessons already embedded.' });
  }

  const svc = await createServiceClient();
  if (!svc) return NextResponse.json({ error: 'DB unavailable' }, { status: 500 });

  let processed = 0;
  let failed = 0;

  // Process in batches of 10 to respect OpenAI rate limits
  const BATCH = 10;
  for (let i = 0; i < lessons.length; i += BATCH) {
    const batch = lessons.slice(i, i + BATCH);

    await Promise.all(
      batch.map(async (lesson: { id: string; question_text: string }) => {
        const embedding = await embedText(lesson.question_text);
        if (!embedding) {
          failed++;
          return;
        }
        const { error: updateError } = await svc
          .from('wa_lessons')
          .update({ question_embedding: embedding })
          .eq('id', lesson.id);

        if (updateError) {
          failed++;
        } else {
          processed++;
        }
      })
    );
  }

  return NextResponse.json({
    processed,
    skipped: 0,
    failed,
    remaining: lessons.length - processed - failed,
  });
}
