-- Atomic unread-count increment for wa_conversations.
-- Eliminates the TOCTOU race in the JS fallback (read-then-write).

CREATE OR REPLACE FUNCTION increment_wa_unread(conv_id UUID)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE wa_conversations
  SET unread_count = COALESCE(unread_count, 0) + 1
  WHERE id = conv_id;
$$;
