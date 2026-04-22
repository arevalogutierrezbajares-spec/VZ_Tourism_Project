-- 024: Multilingual support for WhatsApp agent
-- Adds Spanish translation column to wa_messages and 'auto' language mode

-- 1. Add content_es column for Spanish translations
--    (content_en already exists for English translations)
ALTER TABLE wa_messages ADD COLUMN IF NOT EXISTS content_es TEXT;

-- 2. Expand tone_language to include 'auto' (reply in guest's language)
--    Drop the old check constraint and add the new one
DO $$
BEGIN
  -- Try dropping named constraint first (may not exist on all setups)
  ALTER TABLE posada_whatsapp_config
    DROP CONSTRAINT IF EXISTS wa_config_tone_language_check;
  ALTER TABLE posada_whatsapp_config
    DROP CONSTRAINT IF EXISTS posada_whatsapp_config_tone_language_check;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

ALTER TABLE posada_whatsapp_config
  ADD CONSTRAINT posada_whatsapp_config_tone_language_check
  CHECK (tone_language IN ('es', 'en', 'bilingual', 'auto'));

-- 3. Index on detected_lang for dashboard filtering by language
CREATE INDEX IF NOT EXISTS idx_wa_messages_detected_lang
  ON wa_messages (detected_lang)
  WHERE detected_lang IS NOT NULL;

COMMENT ON COLUMN wa_messages.content_es IS 'Spanish translation of the message (null if already in Spanish)';
COMMENT ON COLUMN wa_messages.content_en IS 'English translation of the message (null if already in English)';
