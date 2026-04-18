-- ============================================================
-- 011_whatsapp_messaging.sql
-- AI Guest Messaging — posada WhatsApp concierge layer
-- ============================================================

-- --------------------------------------------------------
-- posada_whatsapp_config
-- One row per provider. Stores Meta Cloud API credentials
-- and per-posada AI persona / tone settings.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS posada_whatsapp_config (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id         UUID        NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  -- Meta WhatsApp Cloud API
  phone_number_id     TEXT        NOT NULL,
  access_token        TEXT        NOT NULL,
  verify_token        TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  -- AI persona
  persona_name        TEXT        NOT NULL DEFAULT 'Asistente',
  persona_bio         TEXT,
  -- Tone config
  tone_formality      TEXT        NOT NULL DEFAULT 'casual'
    CHECK (tone_formality IN ('casual', 'neutral', 'formal')),
  tone_language       TEXT        NOT NULL DEFAULT 'es'
    CHECK (tone_language IN ('es', 'en', 'bilingual')),
  response_length     TEXT        NOT NULL DEFAULT 'brief'
    CHECK (response_length IN ('brief', 'standard', 'detailed')),
  booking_pressure    TEXT        NOT NULL DEFAULT 'soft'
    CHECK (booking_pressure IN ('soft', 'direct')),
  upsell_enabled      BOOLEAN     NOT NULL DEFAULT true,
  custom_instructions TEXT,
  ai_enabled          BOOLEAN     NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id)
);

-- --------------------------------------------------------
-- wa_conversations
-- One row per unique guest phone number per provider.
-- Tracks mode (ai/human/escalated/closed) and booking stage.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS wa_conversations (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id           UUID        NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  guest_phone           TEXT        NOT NULL,
  guest_name            TEXT,
  status                TEXT        NOT NULL DEFAULT 'ai'
    CHECK (status IN ('ai', 'human', 'escalated', 'closed')),
  unread_count          INTEGER     NOT NULL DEFAULT 0,
  last_message_at       TIMESTAMPTZ,
  last_message_preview  TEXT,
  booking_stage         TEXT        NOT NULL DEFAULT 'lead'
    CHECK (booking_stage IN ('lead', 'quoted', 'confirmed', 'checked_in', 'closed')),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, guest_phone)
);

-- --------------------------------------------------------
-- wa_messages
-- Every inbound and outbound message in a conversation.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS wa_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES wa_conversations(id) ON DELETE CASCADE,
  wa_message_id   TEXT,                     -- Meta message ID (for dedup)
  role            TEXT        NOT NULL CHECK (role IN ('inbound', 'outbound')),
  content         TEXT        NOT NULL,
  is_ai           BOOLEAN     NOT NULL DEFAULT false,
  flagged         BOOLEAN     NOT NULL DEFAULT false,
  flag_reason     TEXT,
  sentiment_score FLOAT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- wa_escalations
-- Tracks when and why a conversation was escalated.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS wa_escalations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES wa_conversations(id) ON DELETE CASCADE,
  reason          TEXT        NOT NULL,
  trigger_type    TEXT        CHECK (trigger_type IN ('manual', 'sentiment', 'bot_question', 'keyword', 'value_threshold')),
  assigned_to     UUID        REFERENCES users(id),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- Indexes
-- --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_wa_conv_provider    ON wa_conversations (provider_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_conv_status      ON wa_conversations (provider_id, status);
CREATE INDEX IF NOT EXISTS idx_wa_msgs_conv        ON wa_messages (conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_wa_msgs_wa_id       ON wa_messages (wa_message_id) WHERE wa_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wa_esc_conv         ON wa_escalations (conversation_id);
CREATE INDEX IF NOT EXISTS idx_wa_config_phone     ON posada_whatsapp_config (phone_number_id);

-- --------------------------------------------------------
-- updated_at triggers (reuse existing trigger function)
-- --------------------------------------------------------
CREATE TRIGGER set_updated_at_wa_config
  BEFORE UPDATE ON posada_whatsapp_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_wa_conversations
  BEFORE UPDATE ON wa_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- --------------------------------------------------------
-- Row Level Security
-- --------------------------------------------------------
ALTER TABLE posada_whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_conversations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_escalations         ENABLE ROW LEVEL SECURITY;

-- posada_whatsapp_config: provider sees/edits only their own row
CREATE POLICY "provider_owns_config" ON posada_whatsapp_config
  FOR ALL USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

-- wa_conversations: provider sees conversations belonging to them
CREATE POLICY "provider_owns_conversations" ON wa_conversations
  FOR ALL USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

-- wa_messages: provider sees messages in their conversations
CREATE POLICY "provider_sees_messages" ON wa_messages
  FOR ALL USING (
    conversation_id IN (
      SELECT c.id FROM wa_conversations c
      JOIN providers p ON p.id = c.provider_id
      WHERE p.user_id = auth.uid()
    )
  );

-- wa_escalations: provider sees their own escalations
CREATE POLICY "provider_sees_escalations" ON wa_escalations
  FOR ALL USING (
    conversation_id IN (
      SELECT c.id FROM wa_conversations c
      JOIN providers p ON p.id = c.provider_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Admin sees everything
CREATE POLICY "admin_all_config"    ON posada_whatsapp_config FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all_conv"      ON wa_conversations       FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all_messages"  ON wa_messages            FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all_esc"       ON wa_escalations         FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
