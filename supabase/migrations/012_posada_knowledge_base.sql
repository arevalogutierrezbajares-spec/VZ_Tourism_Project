-- ============================================================
-- 012_posada_knowledge_base.sql
-- AI brain for the WhatsApp concierge — structured property
-- knowledge that gets injected into every system prompt.
-- ============================================================

CREATE TABLE IF NOT EXISTS posada_knowledge (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id          UUID        NOT NULL REFERENCES providers(id) ON DELETE CASCADE,

  -- § 1 · Property overview
  property_description TEXT,                    -- who you are, your vibe, your story
  location_details     TEXT,                    -- how to get there, landmarks, area feel

  -- § 2 · Rooms (array of room objects)
  -- [{name, capacity, price_usd, description, amenities: []}]
  room_types           JSONB       NOT NULL DEFAULT '[]'::jsonb,

  -- § 3 · Amenities (free-pick list stored as text array)
  amenities            TEXT[]      NOT NULL DEFAULT '{}',

  -- § 4 · Policies
  -- {check_in, check_out, min_stay_nights, cancellation, deposit_percent, pets, smoking, extra_guest_fee}
  policies             JSONB       NOT NULL DEFAULT '{}'::jsonb,

  -- § 5 · FAQ pairs
  -- [{question, answer}]
  faqs                 JSONB       NOT NULL DEFAULT '[]'::jsonb,

  -- § 6 · Booking process
  booking_process      TEXT,                    -- how guests should proceed to book
  payment_methods      TEXT[]      NOT NULL DEFAULT '{}',

  -- § 7 · Local tips
  nearby_attractions   TEXT,                    -- beaches, restaurants, activities, distances
  languages_spoken     TEXT[]      NOT NULL DEFAULT '{}',

  -- § 8 · Anything else
  special_notes        TEXT,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (provider_id)
);

CREATE INDEX IF NOT EXISTS idx_posada_knowledge_provider ON posada_knowledge (provider_id);

CREATE TRIGGER set_updated_at_posada_knowledge
  BEFORE UPDATE ON posada_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE posada_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provider_owns_knowledge" ON posada_knowledge
  FOR ALL USING (
    provider_id IN (SELECT id FROM providers WHERE user_id = auth.uid())
  );

CREATE POLICY "admin_all_knowledge" ON posada_knowledge
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
