-- Migration 020: Creator Program (self-contained)
-- Embeds all dependencies so it runs cleanly on a fresh Supabase instance
-- that only has migration 001 applied.
--
-- Dependency order:
--   001 assumed (creator_profiles, itineraries, bookings, users, update_updated_at)
--   → guest_bookings  (from 003)
--   → itinerary_referrals  (from 008, extended)
--   → discount_codes / discount_code_uses  (from 015, extended)
--   → creator_invites  (new in 020)
--   → creator_profiles column additions  (new in 020)


-- ═══════════════════════════════════════════════════════════════════════════
-- A. guest_bookings  (migration 003)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS guest_bookings (
  id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id                 TEXT        NOT NULL,
  listing_name               TEXT        NOT NULL,
  listing_slug               TEXT,
  provider_id                TEXT,
  guest_name                 TEXT        NOT NULL,
  guest_email                TEXT        NOT NULL,
  guest_phone                TEXT,
  check_in                   DATE        NOT NULL,
  check_out                  DATE        NOT NULL,
  guest_count                INTEGER     NOT NULL DEFAULT 1,
  base_price_usd             NUMERIC(10,2) NOT NULL,
  nights                     INTEGER     NOT NULL DEFAULT 1,
  subtotal_usd               NUMERIC(10,2) NOT NULL,
  service_fee_usd            NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_usd                  NUMERIC(10,2) NOT NULL,
  commission_usd             NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_provider_usd           NUMERIC(10,2) NOT NULL DEFAULT 0,
  status                     TEXT        NOT NULL DEFAULT 'pending',
  payment_method             TEXT        NOT NULL DEFAULT 'card',
  payment_intent_id          TEXT,
  stripe_checkout_session_id TEXT,
  confirmation_code          TEXT        NOT NULL,
  special_requests           TEXT,
  notes                      TEXT,
  -- discount columns (migration 015)
  discount_code_id           UUID,       -- FK added below after discount_codes exists
  discount_amount_usd        NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_bookings_email   ON guest_bookings(guest_email);
CREATE INDEX IF NOT EXISTS idx_guest_bookings_status  ON guest_bookings(status);
CREATE INDEX IF NOT EXISTS idx_guest_bookings_session ON guest_bookings(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_guest_bookings_listing ON guest_bookings(listing_id);

ALTER TABLE guest_bookings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role has full access to guest_bookings"
    ON guest_bookings FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_guest_bookings_updated_at
    BEFORE UPDATE ON guest_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- B. itineraries — extra columns  (migrations 008, 015)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS is_influencer_pick BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS creator_text TEXT;


-- ═══════════════════════════════════════════════════════════════════════════
-- C. itinerary_referrals  (migration 008 + 020 extensions)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS itinerary_referrals (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id          UUID        NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  creator_id            UUID        NOT NULL REFERENCES creator_profiles(id),
  referral_code         TEXT        NOT NULL,
  ip_hash               TEXT        NOT NULL,
  booking_id            UUID        REFERENCES bookings(id) ON DELETE SET NULL,
  guest_booking_id      UUID        REFERENCES guest_bookings(id) ON DELETE SET NULL,
  clicked_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  converted_at          TIMESTAMPTZ,
  paid_at               TIMESTAMPTZ,
  commission_rate       NUMERIC(5,4) NOT NULL DEFAULT 0.08,
  commission_amount_usd NUMERIC(10,2),
  UNIQUE(itinerary_id, ip_hash)
);

-- For instances where the table already existed, add only the new columns
ALTER TABLE itinerary_referrals
  ADD COLUMN IF NOT EXISTS guest_booking_id UUID REFERENCES guest_bookings(id) ON DELETE SET NULL;
ALTER TABLE itinerary_referrals
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_itinerary_referrals_creator
  ON itinerary_referrals(creator_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_referrals_code
  ON itinerary_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_itinerary_referrals_paid
  ON itinerary_referrals(creator_id, paid_at) WHERE paid_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_itinerary_referrals_guest_booking
  ON itinerary_referrals(guest_booking_id) WHERE guest_booking_id IS NOT NULL;

ALTER TABLE itinerary_referrals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can insert referral clicks" ON itinerary_referrals
    FOR INSERT WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Creators can read own referrals" ON itinerary_referrals
    FOR SELECT USING (
      creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can read all referrals" ON itinerary_referrals
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update referrals" ON itinerary_referrals
    FOR UPDATE USING (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access to referrals" ON itinerary_referrals
    FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- D. discount_codes  (migration 015)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS discount_codes (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id              UUID        NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  code                    TEXT        NOT NULL UNIQUE,
  type                    TEXT        NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value                   NUMERIC(10,2) NOT NULL,
  min_booking_usd         NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_uses                INTEGER,
  times_used              INTEGER     NOT NULL DEFAULT 0,
  total_revenue_generated NUMERIC(12,2) NOT NULL DEFAULT 0,
  expires_at              TIMESTAMPTZ,
  status                  TEXT        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'paused', 'expired')),
  listing_ids             UUID[],
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT code_format CHECK (code ~ '^[A-Z0-9]{3,15}$')
);

CREATE INDEX IF NOT EXISTS idx_discount_codes_creator ON discount_codes(creator_id, status);
CREATE INDEX IF NOT EXISTS idx_discount_codes_code    ON discount_codes(code);

ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Creators can manage own discount codes" ON discount_codes
    FOR ALL USING (
      creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public can read active codes" ON discount_codes
    FOR SELECT USING (status = 'active');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage all discount codes" ON discount_codes
    FOR ALL USING (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_discount_codes_updated_at
    BEFORE UPDATE ON discount_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- E. discount_code_uses  (migration 015)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS discount_code_uses (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id             UUID        NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  guest_booking_id    UUID        REFERENCES guest_bookings(id) ON DELETE SET NULL,
  discount_amount_usd NUMERIC(10,2) NOT NULL,
  used_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- If table already existed with TEXT column, cast it to UUID
DO $$ BEGIN
  ALTER TABLE discount_code_uses
    ALTER COLUMN guest_booking_id TYPE UUID USING (guest_booking_id::UUID);
EXCEPTION
  WHEN datatype_mismatch THEN NULL;  -- already UUID
  WHEN others THEN RAISE;
END $$;

DO $$ BEGIN
  ALTER TABLE discount_code_uses
    ADD CONSTRAINT fk_discount_code_uses_guest_booking
    FOREIGN KEY (guest_booking_id) REFERENCES guest_bookings(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_discount_code_uses_code
  ON discount_code_uses(code_id, used_at);
CREATE INDEX IF NOT EXISTS idx_guest_bookings_discount_code
  ON guest_bookings(discount_code_id) WHERE discount_code_id IS NOT NULL;

ALTER TABLE discount_code_uses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role full access to discount_code_uses" ON discount_code_uses
    FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Now that discount_codes exists, add the FK on guest_bookings.discount_code_id
DO $$ BEGIN
  ALTER TABLE guest_bookings
    ADD CONSTRAINT fk_guest_bookings_discount_code
    FOREIGN KEY (discount_code_id) REFERENCES discount_codes(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Atomic increment RPC
CREATE OR REPLACE FUNCTION increment_discount_code_use(
  p_code_id UUID,
  p_revenue NUMERIC DEFAULT 0
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE discount_codes
  SET
    times_used              = times_used + 1,
    total_revenue_generated = total_revenue_generated + p_revenue
  WHERE id = p_code_id;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- F. creator_profiles — new columns  (migration 020)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE creator_profiles ALTER COLUMN username DROP NOT NULL;

ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS display_name        TEXT;
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS location             TEXT;
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS niche_tags           TEXT[]      NOT NULL DEFAULT '{}';
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS followers_count      INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS total_likes          INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS commission_rate      NUMERIC(5,4) NOT NULL DEFAULT 0.08;
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS discount_codes_enabled BOOLEAN   NOT NULL DEFAULT false;


-- ═══════════════════════════════════════════════════════════════════════════
-- G. creator_invites  (new in 020)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS creator_invites (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token        TEXT        UNIQUE NOT NULL,
  email        TEXT,
  invited_name TEXT,
  invited_by   UUID        REFERENCES users(id),
  claimed_at   TIMESTAMPTZ,
  claimed_by   UUID        REFERENCES users(id),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_invites_token ON creator_invites(token);

ALTER TABLE creator_invites ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins can manage invites" ON creator_invites
    FOR ALL USING (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access to invites" ON creator_invites
    FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
