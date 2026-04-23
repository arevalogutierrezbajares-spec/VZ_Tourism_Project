-- ============================================================
-- 026_hitl_remediation.sql
-- HITL (Human-in-the-Loop) remediation: 24-hour window tracking,
-- media support, outbound idempotency, ghost RPC fix,
-- escalation constraint expansion, and wa-media storage bucket.
-- ============================================================

-- ─── 1. Track 24-hour window ────────────────────────────────────────────────
-- WhatsApp Business API requires messages be sent within 24 hours of the
-- last customer (inbound) message. This column tracks that timestamp
-- independently from last_message_at (which includes outbound messages).

ALTER TABLE wa_conversations
  ADD COLUMN IF NOT EXISTS last_customer_message_at TIMESTAMPTZ;

COMMENT ON COLUMN wa_conversations.last_customer_message_at IS
  'Timestamp of the last inbound (customer) message; used to enforce the WhatsApp 24-hour messaging window';

-- Backfill from last_message_at for non-closed conversations
UPDATE wa_conversations
SET last_customer_message_at = last_message_at
WHERE status != 'closed'
  AND last_message_at IS NOT NULL
  AND last_customer_message_at IS NULL;

-- ─── 2. Media support columns ───────────────────────────────────────────────
-- Support for inbound/outbound images, audio, video, and documents.

ALTER TABLE wa_messages
  ADD COLUMN IF NOT EXISTS media_url  TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT,
  ADD COLUMN IF NOT EXISTS media_id   TEXT;

COMMENT ON COLUMN wa_messages.media_url IS
  'Public URL of downloaded media file in Supabase Storage (wa-media bucket)';
COMMENT ON COLUMN wa_messages.media_type IS
  'MIME type of the media attachment (e.g. image/jpeg, audio/ogg, video/mp4)';
COMMENT ON COLUMN wa_messages.media_id IS
  'Meta Cloud API media ID used to download the original file';

-- ─── 3. Outbound idempotency ────────────────────────────────────────────────
-- Prevents duplicate outbound sends when the webhook or queue retries.

ALTER TABLE wa_messages
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

COMMENT ON COLUMN wa_messages.idempotency_key IS
  'Unique key for outbound messages to prevent duplicate sends on retry';

-- Partial unique index: only outbound messages carry an idempotency key
CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_msgs_idempotency_key
  ON wa_messages (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ─── 4. Fix ghost RPC: set_message_content_es ───────────────────────────────
-- The frontend calls supabase.rpc('set_message_content_es') but no function
-- was ever created. Define it here.

CREATE OR REPLACE FUNCTION set_message_content_es(msg_id UUID, es_text TEXT)
RETURNS void AS $$
BEGIN
  UPDATE wa_messages SET content_es = es_text WHERE id = msg_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION set_message_content_es(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_message_content_es(UUID, TEXT) TO service_role;

-- ─── 5. Fix escalation trigger_type constraint ──────────────────────────────
-- The existing CHECK only allows 5 values but code already uses ai_error,
-- hitl, and topic_guard. Drop and recreate with the full set.

ALTER TABLE wa_escalations DROP CONSTRAINT IF EXISTS wa_escalations_trigger_type_check;

ALTER TABLE wa_escalations ADD CONSTRAINT wa_escalations_trigger_type_check
  CHECK (trigger_type IN (
    'manual',
    'sentiment',
    'bot_question',
    'keyword',
    'value_threshold',
    'ai_error',
    'hitl',
    'topic_guard'
  ));

-- ─── 6. Storage bucket for media ────────────────────────────────────────────
-- Public bucket with 10 MB file size limit for WhatsApp media downloads.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('wa-media', 'wa-media', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Service role can insert any object (used by the webhook handler)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'wa_media_service_insert'
  ) THEN
    CREATE POLICY "wa_media_service_insert"
      ON storage.objects
      FOR INSERT
      TO service_role
      WITH CHECK (bucket_id = 'wa-media');
  END IF;
END $$;

-- Authenticated users can read media from their provider's folder
-- Folder structure: wa-media/{provider_id}/...
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'wa_media_provider_read'
  ) THEN
    CREATE POLICY "wa_media_provider_read"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'wa-media'
        AND (storage.foldername(name))[1] IN (
          SELECT id::TEXT FROM providers WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ─── 7. Indexes ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_wa_conv_last_customer_msg
  ON wa_conversations (last_customer_message_at)
  WHERE last_customer_message_at IS NOT NULL;

-- idx_wa_msgs_idempotency: same as the unique index created in section 3,
-- listed here for documentation completeness. The unique index already
-- serves as the lookup index.

CREATE INDEX IF NOT EXISTS idx_wa_msgs_media
  ON wa_messages (media_url)
  WHERE media_url IS NOT NULL;

-- ─── 8. Comments (supplementary) ────────────────────────────────────────────
-- Primary COMMENT ON COLUMN statements are co-located with their ALTER TABLEs
-- above (sections 1-3). This section adds any remaining documentation.

COMMENT ON CONSTRAINT wa_escalations_trigger_type_check ON wa_escalations IS
  'Allowed escalation trigger types: manual, sentiment, bot_question, keyword, value_threshold, ai_error, hitl, topic_guard';
