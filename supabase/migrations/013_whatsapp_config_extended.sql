-- ────────────────────────────────────────────────────────────────────────────
-- 013_whatsapp_config_extended.sql
-- Extends posada_whatsapp_config with granular AI control panel settings.
-- ────────────────────────────────────────────────────────────────────────────

-- Extended tone / personality
ALTER TABLE posada_whatsapp_config
  ADD COLUMN IF NOT EXISTS emoji_style TEXT NOT NULL DEFAULT 'moderate'
    CHECK (emoji_style IN ('frequent', 'moderate', 'none')),
  ADD COLUMN IF NOT EXISTS greeting_style TEXT NOT NULL DEFAULT 'friendly'
    CHECK (greeting_style IN ('friendly', 'professional', 'custom')),
  ADD COLUMN IF NOT EXISTS custom_greeting TEXT;

-- Escalation controls
ALTER TABLE posada_whatsapp_config
  ADD COLUMN IF NOT EXISTS sentiment_threshold FLOAT NOT NULL DEFAULT 0.3
    CHECK (sentiment_threshold >= 0 AND sentiment_threshold <= 1),
  ADD COLUMN IF NOT EXISTS value_escalation_usd INTEGER NOT NULL DEFAULT 0,   -- 0 = disabled
  ADD COLUMN IF NOT EXISTS escalation_keywords TEXT[] NOT NULL DEFAULT '{}';

-- Humanisation
ALTER TABLE posada_whatsapp_config
  ADD COLUMN IF NOT EXISTS response_delay_ms INTEGER NOT NULL DEFAULT 0
    CHECK (response_delay_ms >= 0 AND response_delay_ms <= 10000);

-- Working hours
ALTER TABLE posada_whatsapp_config
  ADD COLUMN IF NOT EXISTS working_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS working_hours JSONB,       -- {mon:{active,start,end}, …}
  ADD COLUMN IF NOT EXISTS after_hours_message TEXT;
