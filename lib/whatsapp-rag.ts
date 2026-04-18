import OpenAI from 'openai';

// ─── Types ────────────────────────────────────────────────────────────────

export interface RagLesson {
  id: string;
  question_text: string;
  answer_text: string;
  context_tags: string[];
  source: string;
  times_used: number;
  similarity: number;
}

// ─── OpenAI client (embeddings only) ─────────────────────────────────────

function getOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

// ─── Embed a string → number[] ────────────────────────────────────────────

export async function embedText(text: string): Promise<number[] | null> {
  const client = getOpenAIClient();
  if (!client) {
    console.warn('[whatsapp-rag] OPENAI_API_KEY not set — embeddings disabled');
    return null;
  }

  try {
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000), // model limit safety
      encoding_format: 'float',
    });
    return response.data[0].embedding;
  } catch (err) {
    console.error('[whatsapp-rag] embedText error:', err);
    return null;
  }
}

// ─── Find relevant lessons via vector similarity ──────────────────────────
// Returns top-N lessons whose embeddings are most similar to the query.
// Falls back to empty array if embeddings are unavailable.

export async function findRelevantLessons(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  providerId: string,
  questionText: string,
  limit = 3,
  threshold = 0.70
): Promise<RagLesson[]> {
  const embedding = await embedText(questionText);
  if (!embedding) return [];

  try {
    const { data, error } = await supabase.rpc('match_wa_lessons', {
      provider_id_param: providerId,
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) {
      console.error('[whatsapp-rag] match_wa_lessons error:', error.message);
      return [];
    }

    return (data ?? []) as RagLesson[];
  } catch (err) {
    console.error('[whatsapp-rag] findRelevantLessons error:', err);
    return [];
  }
}

// ─── Increment times_used for lessons that were actually retrieved ────────

export async function trackLessonUsage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  lessonIds: string[]
): Promise<void> {
  if (lessonIds.length === 0) return;
  try {
    // Increment via RPC-style update — supabase doesn't have atomic increment in the JS client
    // so we do it one by one (small array, acceptable)
    await Promise.all(
      lessonIds.map((id) =>
        supabase.rpc('increment_lesson_usage', { lesson_id_param: id })
      )
    );
  } catch {
    // Non-critical — usage tracking failure doesn't affect the reply
  }
}

// ─── Format lessons for injection into system prompt ─────────────────────

export function buildRagContext(lessons: RagLesson[]): string {
  if (lessons.length === 0) return '';

  const examples = lessons
    .map((lesson, i) => {
      const tagLine =
        lesson.context_tags.length > 0
          ? ` [${lesson.context_tags.join(', ')}]`
          : '';
      return [
        `Example ${i + 1}${tagLine}:`,
        `Guest: "${lesson.question_text}"`,
        `Your answer: "${lesson.answer_text}"`,
      ].join('\n');
    })
    .join('\n\n');

  return `RELEVANT TRAINING EXAMPLES — mirror this style and content in your reply:
${examples}`;
}
