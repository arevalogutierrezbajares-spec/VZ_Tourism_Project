-- Migration 018: Schema improvements
-- Incorporates 013_whatsapp_config_extended (never applied — version conflict)
-- plus schema fixes identified in review:
--   • posada_whatsapp_config extended columns (was 013_whatsapp_config_extended.sql)
--   • Missing index on providers.user_id (hot path for every RLS policy)
--   • Missing index on providers.region
--   • Missing updated_at triggers for guides and creator_profiles
--   • Removes duplicate ruta_update_updated_at() function
--   • Fixes discount_code_uses.guest_booking_id type (TEXT → UUID + FK)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. posada_whatsapp_config extended columns
--    (Originally 013_whatsapp_config_extended.sql — never applied due to
--    duplicate version key collision with 013_pricing_rules.sql)
-- ─────────────────────────────────────────────────────────────────────────────

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
  ADD COLUMN IF NOT EXISTS value_escalation_usd INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalation_keywords TEXT[] NOT NULL DEFAULT '{}';

-- Humanisation
ALTER TABLE posada_whatsapp_config
  ADD COLUMN IF NOT EXISTS response_delay_ms INTEGER NOT NULL DEFAULT 0
    CHECK (response_delay_ms >= 0 AND response_delay_ms <= 10000);

-- Working hours
ALTER TABLE posada_whatsapp_config
  ADD COLUMN IF NOT EXISTS working_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS working_hours JSONB,
  ADD COLUMN IF NOT EXISTS after_hours_message TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Missing index on providers.user_id
--    Used in every RLS policy across providers, listings, whatsapp config,
--    conversations, and knowledge base. Without this every auth check is a seq scan.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_providers_user_id ON providers(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Missing index on providers.region
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_providers_region ON providers(region);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Missing updated_at triggers for guides and creator_profiles
--    Both tables have the column but no trigger was added in migration 001.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TRIGGER update_guides_updated_at
    BEFORE UPDATE ON guides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_creator_profiles_updated_at
    BEFORE UPDATE ON creator_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Drop duplicate ruta_update_updated_at() — identical to update_updated_at().
--    Drop old triggers first, then the function, then recreate using shared function.
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS ruta_drivers_updated_at  ON ruta_drivers;
DROP TRIGGER IF EXISTS ruta_vehicles_updated_at ON ruta_vehicles;
DROP TRIGGER IF EXISTS ruta_rides_updated_at    ON ruta_rides;

DROP FUNCTION IF EXISTS ruta_update_updated_at();

DO $$ BEGIN
  CREATE TRIGGER ruta_drivers_updated_at
    BEFORE UPDATE ON ruta_drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER ruta_vehicles_updated_at
    BEFORE UPDATE ON ruta_vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER ruta_rides_updated_at
    BEFORE UPDATE ON ruta_rides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Fix discount_code_uses.guest_booking_id: TEXT → UUID with FK.
--    Safe because migration 015 (which creates this table) runs before this one
--    and no production data exists in this column at time of first push.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE discount_code_uses
  ALTER COLUMN guest_booking_id TYPE UUID USING guest_booking_id::UUID;

ALTER TABLE discount_code_uses
  ADD CONSTRAINT fk_discount_code_uses_guest_booking
    FOREIGN KEY (guest_booking_id) REFERENCES guest_bookings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_discount_code_uses_guest_booking
  ON discount_code_uses(guest_booking_id)
  WHERE guest_booking_id IS NOT NULL;
