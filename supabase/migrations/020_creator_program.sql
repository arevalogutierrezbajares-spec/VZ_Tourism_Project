-- Migration 020: Creator Program
-- Fixes 5 schema gaps discovered during plan-eng-review, plus creator_invites table
-- Resilient: creates tables if not yet present (works regardless of which earlier
-- migrations have been applied to this Supabase instance).

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. creator_profiles — add missing columns
-- ═══════════════════════════════════════════════════════════════════════════

-- Make username nullable so invite claim can insert profile before onboarding
ALTER TABLE creator_profiles ALTER COLUMN username DROP NOT NULL;

-- Display name separate from username (shown publicly)
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Location string shown on public profile
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS location TEXT;

-- Niche tags for profile filtering (max 3 per onboarding wizard)
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS niche_tags TEXT[] NOT NULL DEFAULT '{}';

-- followers_count: public profile page uses this name (DB had `followers`)
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS followers_count INTEGER NOT NULL DEFAULT 0;

-- total_likes: aggregate of likes across all published itineraries
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS total_likes INTEGER NOT NULL DEFAULT 0;

-- Per-creator commission rate; default 8% (can be overridden per creator by admin)
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.08;


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. itinerary_referrals — create if missing, then add new columns
-- ═══════════════════════════════════════════════════════════════════════════

-- Create the table with all required columns if migration 008 was never run.
-- ADD COLUMN IF NOT EXISTS below is a no-op when the column already exists.
CREATE TABLE IF NOT EXISTS itinerary_referrals (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id     UUID        NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  creator_id       UUID        NOT NULL REFERENCES creator_profiles(id),
  referral_code    TEXT        NOT NULL,
  ip_hash          TEXT        NOT NULL,
  booking_id       UUID        REFERENCES bookings(id) ON DELETE SET NULL,
  guest_booking_id UUID        REFERENCES guest_bookings(id) ON DELETE SET NULL,
  clicked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  converted_at     TIMESTAMPTZ,
  paid_at          TIMESTAMPTZ,
  commission_rate  NUMERIC(5,4) NOT NULL DEFAULT 0.08,
  commission_amount_usd NUMERIC(10,2),
  UNIQUE(itinerary_id, ip_hash)
);

-- For instances where the table already existed (migration 008 was run),
-- add only the new columns.
ALTER TABLE itinerary_referrals
  ADD COLUMN IF NOT EXISTS guest_booking_id UUID REFERENCES guest_bookings(id) ON DELETE SET NULL;

ALTER TABLE itinerary_referrals
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_itinerary_referrals_creator
  ON itinerary_referrals(creator_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_referrals_code
  ON itinerary_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_itinerary_referrals_paid
  ON itinerary_referrals(creator_id, paid_at) WHERE paid_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_itinerary_referrals_guest_booking
  ON itinerary_referrals(guest_booking_id) WHERE guest_booking_id IS NOT NULL;

-- RLS
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
-- 3. discount_code_uses — create if missing, then fix TEXT→UUID
-- ═══════════════════════════════════════════════════════════════════════════

-- Create the table if migration 015 was never run.
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
  status                  TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired')),
  listing_ids             UUID[],
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT code_format CHECK (code ~ '^[A-Z0-9]{3,15}$')
);

CREATE TABLE IF NOT EXISTS discount_code_uses (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id             UUID        NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  guest_booking_id    UUID        REFERENCES guest_bookings(id) ON DELETE SET NULL,
  discount_amount_usd NUMERIC(10,2) NOT NULL,
  used_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- For instances where discount_code_uses already existed with TEXT column,
-- cast it to UUID in-place. NULLs pass through; valid UUID strings cast cleanly.
DO $$ BEGIN
  ALTER TABLE discount_code_uses
    ALTER COLUMN guest_booking_id TYPE UUID USING (guest_booking_id::UUID);
EXCEPTION
  WHEN datatype_mismatch THEN NULL; -- already UUID, skip
  WHEN others THEN RAISE;
END $$;

-- FK constraint (idempotent via DO block)
DO $$ BEGIN
  ALTER TABLE discount_code_uses
    ADD CONSTRAINT fk_discount_code_uses_guest_booking
    FOREIGN KEY (guest_booking_id)
    REFERENCES guest_bookings(id)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ensure discount_codes_enabled exists on creator_profiles (migration 015 adds it)
ALTER TABLE creator_profiles
  ADD COLUMN IF NOT EXISTS discount_codes_enabled BOOLEAN NOT NULL DEFAULT false;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_discount_codes_creator ON discount_codes(creator_id, status);
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_code_uses_code ON discount_code_uses(code_id, used_at);

-- RLS
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_code_uses ENABLE ROW LEVEL SECURITY;

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
  CREATE POLICY "Service role full access to discount_code_uses" ON discount_code_uses
    FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Atomic increment RPC (CREATE OR REPLACE is always safe)
CREATE OR REPLACE FUNCTION increment_discount_code_use(
  p_code_id UUID,
  p_revenue NUMERIC DEFAULT 0
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE discount_codes
  SET
    times_used = times_used + 1,
    total_revenue_generated = total_revenue_generated + p_revenue
  WHERE id = p_code_id;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. creator_invites — invite-only signup token table
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
