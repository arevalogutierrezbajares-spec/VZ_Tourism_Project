-- Itinerary Marketplace: new columns, referral tracking, RLS
-- Migration 008

-- New columns on itineraries
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS is_influencer_pick BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Itinerary referrals table (commission tracking)
CREATE TABLE IF NOT EXISTS itinerary_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creator_profiles(id),
  referral_code TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  converted_at TIMESTAMPTZ,
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.10,
  commission_amount_usd NUMERIC(10,2),
  UNIQUE(itinerary_id, ip_hash)
);

-- Index for creator lookups
CREATE INDEX IF NOT EXISTS idx_itinerary_referrals_creator ON itinerary_referrals(creator_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_referrals_code ON itinerary_referrals(referral_code);

-- Index for influencer picks query
CREATE INDEX IF NOT EXISTS idx_itineraries_influencer_pick ON itineraries(is_influencer_pick) WHERE is_influencer_pick = TRUE;

-- RLS for itinerary_referrals
ALTER TABLE itinerary_referrals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can insert referral clicks" ON itinerary_referrals
    FOR INSERT WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Creators can read own referrals" ON itinerary_referrals
    FOR SELECT USING (
      creator_id IN (
        SELECT id FROM creator_profiles WHERE user_id = auth.uid()
      )
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
  CREATE POLICY "Admins can delete referrals" ON itinerary_referrals
    FOR DELETE USING (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
