-- Prevent two providers from registering the same WhatsApp phone number.
-- The existing idx_wa_config_phone is a regular index. This replaces it
-- with a proper UNIQUE constraint to prevent cross-tenant message routing bugs.

DROP INDEX IF EXISTS idx_wa_config_phone;

ALTER TABLE posada_whatsapp_config
  ADD CONSTRAINT unique_phone_number_id UNIQUE (phone_number_id);
