-- WhatsApp access token encryption via Supabase Vault
-- Migration 016
--
-- Strategy: additive migration with graceful Vault fallback.
-- If Vault is NOT enabled (not on Pro plan), all functions return NULL and
-- the app code falls back to the existing plaintext access_token column.
-- When Vault IS enabled, run the backfill block at the bottom.
-- The plaintext column is retained until all rows are migrated and verified.

-- 1. Add vault ID column to store the Vault secret reference
ALTER TABLE posada_whatsapp_config
  ADD COLUMN IF NOT EXISTS access_token_vault_id UUID;

-- 2. Read helper — SECURITY DEFINER so service role accesses Vault
--    Returns NULL if Vault is not installed (app falls back to plaintext).
CREATE OR REPLACE FUNCTION vault_read_wa_token(p_vault_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
BEGIN
  BEGIN
    RETURN vault.decrypted_secret(p_vault_id);
  EXCEPTION
    WHEN undefined_function THEN RETURN NULL;  -- vault extension not installed
    WHEN OTHERS THEN RETURN NULL;              -- vault entry missing / revoked
  END;
END;
$$;

-- 3. Write helper — create or rotate a Vault secret for one token
--    Returns the new vault UUID, or NULL if Vault is not installed.
CREATE OR REPLACE FUNCTION upsert_wa_access_token(
  p_config_id UUID,
  p_token      TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret_name TEXT := 'wa_token_' || p_config_id;
  v_vault_id    UUID;
BEGIN
  -- Check if a secret already exists for this config
  SELECT id INTO v_vault_id
    FROM vault.secrets
   WHERE name = v_secret_name
   LIMIT 1;

  BEGIN
    IF v_vault_id IS NOT NULL THEN
      -- Rotate existing secret
      PERFORM vault.update_secret(v_vault_id, p_token);
      RETURN v_vault_id;
    ELSE
      -- Create new secret
      RETURN vault.create_secret(p_token, v_secret_name);
    END IF;
  EXCEPTION
    WHEN undefined_function THEN RETURN NULL;  -- vault not installed
    WHEN OTHERS THEN RETURN NULL;
  END;
END;
$$;

-- 4. Backfill existing rows into Vault
--    Run manually AFTER enabling the vault extension on Pro plan.
--    Safe to run multiple times (upsert_wa_access_token handles rotation).
--
-- DO $$
-- DECLARE
--   r RECORD;
--   v_vault_id UUID;
-- BEGIN
--   FOR r IN SELECT id, access_token FROM posada_whatsapp_config WHERE access_token IS NOT NULL LOOP
--     v_vault_id := upsert_wa_access_token(r.id, r.access_token);
--     IF v_vault_id IS NOT NULL THEN
--       UPDATE posada_whatsapp_config
--          SET access_token_vault_id = v_vault_id
--        WHERE id = r.id;
--       RAISE NOTICE 'Migrated token for config %', r.id;
--     END IF;
--   END LOOP;
-- END;
-- $$;
--
-- After verifying all access_token_vault_id values are set, drop the plaintext column:
-- ALTER TABLE posada_whatsapp_config DROP COLUMN access_token;

-- 5. Index for vault lookups
CREATE INDEX IF NOT EXISTS idx_wa_config_vault_id
  ON posada_whatsapp_config (access_token_vault_id)
  WHERE access_token_vault_id IS NOT NULL;
