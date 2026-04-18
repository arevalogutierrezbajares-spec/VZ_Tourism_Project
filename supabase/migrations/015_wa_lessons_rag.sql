-- ============================================================
-- 015_wa_lessons_rag.sql
-- WhatsApp Training Lessons + pgvector RAG
--
-- Adds:
--   • wa_lessons — provider Q&A pairs with vector embeddings
--   • tone_profile + training_imports cols on posada_knowledge
--   • match_wa_lessons() — cosine similarity search RPC
--   • increment_lesson_usage() — atomic counter RPC
-- ============================================================

-- Enable pgvector (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── wa_lessons ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wa_lessons (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id        UUID        NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  question_text      TEXT        NOT NULL,
  answer_text        TEXT        NOT NULL,
  context_tags       TEXT[]      NOT NULL DEFAULT '{}',
  source             TEXT        NOT NULL DEFAULT 'manual'
    CHECK (source IN ('historical_import', 'hitl_correction', 'manual')),
  conversation_id    UUID        REFERENCES wa_conversations(id) ON DELETE SET NULL,
  approved           BOOLEAN     NOT NULL DEFAULT true,
  times_used         INTEGER     NOT NULL DEFAULT 0,
  -- 1536 dimensions = text-embedding-3-small
  question_embedding vector(1536),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_lessons_provider ON wa_lessons (provider_id);
-- ivfflat cosine index — rebuild after bulk inserts with VACUUM ANALYZE
CREATE INDEX IF NOT EXISTS idx_wa_lessons_embedding ON wa_lessons
  USING ivfflat (question_embedding vector_cosine_ops) WITH (lists = 100);

CREATE TRIGGER set_updated_at_wa_lessons
  BEFORE UPDATE ON wa_lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE wa_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provider_owns_lessons" ON wa_lessons
  FOR ALL USING (
    provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
  );

CREATE POLICY "service_role_all_lessons" ON wa_lessons
  FOR ALL USING (auth.role() = 'service_role');

-- ─── Extend posada_knowledge ──────────────────────────────────────────────────

ALTER TABLE posada_knowledge
  ADD COLUMN IF NOT EXISTS tone_profile      JSONB,
  ADD COLUMN IF NOT EXISTS training_imports  JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ─── match_wa_lessons() ───────────────────────────────────────────────────────
-- Cosine similarity search over wa_lessons for a given provider.
-- Returns lessons ordered by similarity (highest first).

CREATE OR REPLACE FUNCTION match_wa_lessons(
  provider_id_param  UUID,
  query_embedding    vector(1536),
  match_threshold    FLOAT    DEFAULT 0.70,
  match_count        INTEGER  DEFAULT 3
)
RETURNS TABLE (
  id                UUID,
  question_text     TEXT,
  answer_text       TEXT,
  context_tags      TEXT[],
  source            TEXT,
  times_used        INTEGER,
  similarity        FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    id,
    question_text,
    answer_text,
    context_tags,
    source,
    times_used,
    1 - (question_embedding <=> query_embedding) AS similarity
  FROM wa_lessons
  WHERE
    provider_id   = provider_id_param
    AND approved  = true
    AND question_embedding IS NOT NULL
    AND 1 - (question_embedding <=> query_embedding) >= match_threshold
  ORDER BY question_embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ─── increment_lesson_usage() ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_lesson_usage(lesson_id_param UUID)
RETURNS VOID LANGUAGE sql AS $$
  UPDATE wa_lessons SET times_used = times_used + 1 WHERE id = lesson_id_param;
$$;
