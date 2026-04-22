-- Backfill existing plaintext tokens into Vault.
-- Run ONLY after Vault is enabled on Supabase Pro.
-- Safe to run multiple times (upsert_wa_access_token handles rotation).
DO $$
DECLARE
  r RECORD;
  vid UUID;
BEGIN
  FOR r IN
    SELECT id, access_token
    FROM posada_whatsapp_config
    WHERE access_token IS NOT NULL
      AND access_token_vault_id IS NULL
  LOOP
    SELECT vault.create_secret(
      r.access_token,
      'wa_token_' || r.id::text,
      'WhatsApp access token for config ' || r.id::text
    ) INTO vid;

    UPDATE posada_whatsapp_config
    SET access_token_vault_id = vid,
        access_token = 'MIGRATED_TO_VAULT'
    WHERE id = r.id;
  END LOOP;
END $$;
