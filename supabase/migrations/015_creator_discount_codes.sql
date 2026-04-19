-- Creator discount code system
-- Migration 015

-- Add discount_codes_enabled to creator_profiles (admin toggles this)
ALTER TABLE creator_profiles
  ADD COLUMN IF NOT EXISTS discount_codes_enabled BOOLEAN NOT NULL DEFAULT false;

-- Discount codes table
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value NUMERIC(10,2) NOT NULL,
  min_booking_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_uses INTEGER,                       -- NULL = unlimited
  times_used INTEGER NOT NULL DEFAULT 0,
  total_revenue_generated NUMERIC(12,2) NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,                 -- NULL = never
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired')),
  listing_ids UUID[],                     -- NULL = all listings
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT code_format CHECK (code ~ '^[A-Z0-9]{3,15}$')
);

-- Discount code uses — FK to guest_bookings (not bookings)
CREATE TABLE IF NOT EXISTS discount_code_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  guest_booking_id TEXT,                  -- UUID as text (guest_bookings.id)
  discount_amount_usd NUMERIC(10,2) NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add discount columns to guest_bookings
ALTER TABLE guest_bookings
  ADD COLUMN IF NOT EXISTS discount_code_id UUID REFERENCES discount_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount_usd NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Add creator_text to itineraries (creator's voice for narrative)
ALTER TABLE itineraries
  ADD COLUMN IF NOT EXISTS creator_text TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_discount_codes_creator ON discount_codes(creator_id, status);
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_code_uses_code ON discount_code_uses(code_id, used_at);
CREATE INDEX IF NOT EXISTS idx_guest_bookings_discount_code ON guest_bookings(discount_code_id) WHERE discount_code_id IS NOT NULL;

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

-- Auto-update timestamps
DO $$ BEGIN
  CREATE TRIGGER update_discount_codes_updated_at
    BEFORE UPDATE ON discount_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Atomic increment for webhook use — avoids read-modify-write race
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
