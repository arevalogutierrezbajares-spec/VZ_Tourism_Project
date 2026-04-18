-- Migration 014: Multilingual conversation trail
-- Adds English translation + language detection fields to wa_messages.
-- Every inbound message gets an English translation stored alongside the original
-- so providers can always follow conversations regardless of guest language.

ALTER TABLE wa_messages
  ADD COLUMN IF NOT EXISTS content_en    TEXT,
  ADD COLUMN IF NOT EXISTS detected_lang VARCHAR(10); -- BCP-47 code e.g. 'es', 'en', 'pt'

-- Also track on the conversation level what language the guest primarily uses
ALTER TABLE wa_conversations
  ADD COLUMN IF NOT EXISTS guest_language VARCHAR(10) DEFAULT 'es';

COMMENT ON COLUMN wa_messages.content_en    IS 'English translation of message content. NULL if original is English.';
COMMENT ON COLUMN wa_messages.detected_lang IS 'Detected BCP-47 language code of the message.';
COMMENT ON COLUMN wa_conversations.guest_language IS 'Primary language detected for this guest (BCP-47).';
