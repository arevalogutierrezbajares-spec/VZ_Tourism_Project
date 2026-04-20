-- Migration 020: Creator Program
-- Fixes 5 schema gaps discovered during plan-eng-review, plus creator_invites table
-- Build order: this migration must run before any creator portal UI ships

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
-- Stripe webhook reads this to calculate commission_amount_usd on checkout.session.completed
ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.08;


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. itinerary_referrals — add guest_booking_id FK + paid_at
-- ═══════════════════════════════════════════════════════════════════════════

-- The existing booking_id FK references bookings(id) (old auth-gated table).
-- Stripe checkouts write to guest_bookings, so we need a separate FK column.
-- We keep booking_id for backwards compat; webhook populates guest_booking_id.
ALTER TABLE itinerary_referrals
  ADD COLUMN IF NOT EXISTS guest_booking_id UUID REFERENCES guest_bookings(id) ON DELETE SET NULL;

-- paid_at: set by admin monthly when payout is sent (Zelle / USDT)
-- Earnings dashboard filters WHERE paid_at IS NULL to show pending amount
ALTER TABLE itinerary_referrals
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Index for dashboard queries: pending earnings per creator
CREATE INDEX IF NOT EXISTS idx_itinerary_referrals_paid
  ON itinerary_referrals(creator_id, paid_at) WHERE paid_at IS NULL;

-- Index for webhook lookup: find referral by guest_booking_id
CREATE INDEX IF NOT EXISTS idx_itinerary_referrals_guest_booking
  ON itinerary_referrals(guest_booking_id) WHERE guest_booking_id IS NOT NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. discount_code_uses — fix guest_booking_id from TEXT to UUID
-- ═══════════════════════════════════════════════════════════════════════════

-- migration 015 stored guest_booking_id as TEXT "UUID as text".
-- The earnings union query JOINs to guest_bookings.id (UUID) — type mismatch.
-- Cast in-place; NULLs pass through, valid UUID strings cast cleanly.
ALTER TABLE discount_code_uses
  ALTER COLUMN guest_booking_id TYPE UUID USING (guest_booking_id::UUID);

-- Now we can add the proper FK constraint
ALTER TABLE discount_code_uses
  ADD CONSTRAINT fk_discount_code_uses_guest_booking
  FOREIGN KEY (guest_booking_id)
  REFERENCES guest_bookings(id)
  ON DELETE SET NULL
  NOT VALID; -- NOT VALID: skips locking full table scan; validated on next deploy

ALTER TABLE discount_code_uses
  VALIDATE CONSTRAINT fk_discount_code_uses_guest_booking;


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. creator_invites — invite-only signup token table
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS creator_invites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token       TEXT        UNIQUE NOT NULL,
  email       TEXT,
  invited_name TEXT,
  invited_by  UUID        REFERENCES users(id),
  claimed_at  TIMESTAMPTZ,
  claimed_by  UUID        REFERENCES users(id),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Index for landing page lookup (token → invite details)
CREATE INDEX IF NOT EXISTS idx_creator_invites_token ON creator_invites(token);

-- RLS: service role / admin only (invites are not public-readable)
ALTER TABLE creator_invites ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins can manage invites" ON creator_invites
    FOR ALL USING (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  -- Claim API runs as service_role and needs to read + update tokens
  CREATE POLICY "Service role full access to invites" ON creator_invites
    FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Webhook support: service role UPDATE on itinerary_referrals
-- ═══════════════════════════════════════════════════════════════════════════
-- The existing RLS only allows admins to UPDATE referrals.
-- Stripe webhook runs as service_role — add a policy so it can set
-- guest_booking_id, converted_at, and commission_amount_usd.

DO $$ BEGIN
  CREATE POLICY "Service role full access to referrals" ON itinerary_referrals
    FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
