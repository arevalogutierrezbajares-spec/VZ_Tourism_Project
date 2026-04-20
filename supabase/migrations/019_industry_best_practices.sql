-- Migration 019: Industry best practices
-- 1. Rating/review/booking counter sync via triggers (replaces manual app-side updates)
-- 2. Merge user_profiles into users (single source of truth)
-- 3. Data integrity CHECK constraints
-- 4. Missing performance indexes
-- 5. UNIQUE constraint on guest_bookings.confirmation_code

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. RATING / REVIEW / BOOKING COUNTER SYNC TRIGGERS
--    Previously these counters were updated manually in application code.
--    Triggers ensure consistency regardless of how data enters the database.
-- ═════════════════════════════════════════════════════════════════════════════

-- Function: sync listing.rating, listing.total_reviews, and provider stats
-- after any INSERT, UPDATE, or DELETE on reviews.
CREATE OR REPLACE FUNCTION sync_listing_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_listing_id  UUID;
  v_provider_id UUID;
BEGIN
  v_listing_id := COALESCE(NEW.listing_id, OLD.listing_id);

  UPDATE listings
  SET
    rating        = COALESCE((
      SELECT ROUND(AVG(rating)::NUMERIC, 2)
      FROM   reviews
      WHERE  listing_id = v_listing_id AND is_approved = TRUE
    ), 0),
    total_reviews = (
      SELECT COUNT(*)
      FROM   reviews
      WHERE  listing_id = v_listing_id AND is_approved = TRUE
    )
  WHERE id = v_listing_id
  RETURNING provider_id INTO v_provider_id;

  IF v_provider_id IS NOT NULL THEN
    UPDATE providers
    SET
      rating        = COALESCE((
        SELECT ROUND(AVG(r.rating)::NUMERIC, 2)
        FROM   reviews r
        JOIN   listings l ON l.id = r.listing_id
        WHERE  l.provider_id = v_provider_id AND r.is_approved = TRUE
      ), 0),
      total_reviews = (
        SELECT COUNT(*)
        FROM   reviews r
        JOIN   listings l ON l.id = r.listing_id
        WHERE  l.provider_id = v_provider_id AND r.is_approved = TRUE
      )
    WHERE id = v_provider_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER sync_ratings_on_review
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW EXECUTE FUNCTION sync_listing_rating_stats();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Function: sync listing.total_bookings after any booking status change.
CREATE OR REPLACE FUNCTION sync_listing_booking_count()
RETURNS TRIGGER AS $$
DECLARE
  v_listing_id UUID;
BEGIN
  v_listing_id := COALESCE(NEW.listing_id, OLD.listing_id);

  IF v_listing_id IS NOT NULL THEN
    UPDATE listings
    SET total_bookings = (
      SELECT COUNT(*)
      FROM   bookings
      WHERE  listing_id = v_listing_id
      AND    status IN ('confirmed', 'completed')
    )
    WHERE id = v_listing_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER sync_booking_count_on_booking
    AFTER INSERT OR UPDATE OR DELETE ON bookings
    FOR EACH ROW EXECUTE FUNCTION sync_listing_booking_count();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill: recalculate all counters from current data to fix any drift.
UPDATE listings l
SET
  rating        = COALESCE((
    SELECT ROUND(AVG(r.rating)::NUMERIC, 2)
    FROM   reviews r
    WHERE  r.listing_id = l.id AND r.is_approved = TRUE
  ), 0),
  total_reviews = (
    SELECT COUNT(*) FROM reviews r
    WHERE  r.listing_id = l.id AND r.is_approved = TRUE
  ),
  total_bookings = (
    SELECT COUNT(*) FROM bookings b
    WHERE  b.listing_id = l.id AND b.status IN ('confirmed', 'completed')
  );

UPDATE providers p
SET
  rating        = COALESCE((
    SELECT ROUND(AVG(r.rating)::NUMERIC, 2)
    FROM   reviews r
    JOIN   listings l ON l.id = r.listing_id
    WHERE  l.provider_id = p.id AND r.is_approved = TRUE
  ), 0),
  total_reviews = (
    SELECT COUNT(*)
    FROM   reviews r
    JOIN   listings l ON l.id = r.listing_id
    WHERE  l.provider_id = p.id AND r.is_approved = TRUE
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- 2. MERGE user_profiles INTO users (single source of truth)
--    user_profiles was added in migration 004 and duplicates 5 fields
--    already present in users. Unique fields (interests, emergency contacts,
--    payment info) are moved to users; the redundant table is dropped.
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS interests               TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS emergency_contact_name  TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS payment_zelle_email     TEXT,
  ADD COLUMN IF NOT EXISTS payment_usdt_address    TEXT;

-- Migrate data: users table wins on overlapping fields (it was created first
-- and is already populated by the auth trigger). user_profiles fields fill gaps.
UPDATE users u
SET
  phone                   = COALESCE(NULLIF(u.phone, ''),          up.phone),
  avatar_url              = COALESCE(NULLIF(u.avatar_url, ''),     up.avatar_url),
  full_name               = COALESCE(NULLIF(u.full_name, u.email), NULLIF(up.display_name, ''), u.full_name),
  nationality             = COALESCE(NULLIF(u.nationality, ''),    up.country),
  preferred_language      = COALESCE(NULLIF(u.preferred_language, 'en'), up.language, 'en'),
  interests               = COALESCE(up.interests,                 '{}'),
  emergency_contact_name  = up.emergency_contact_name,
  emergency_contact_phone = up.emergency_contact_phone,
  payment_zelle_email     = up.payment_zelle_email,
  payment_usdt_address    = up.payment_usdt_address
FROM user_profiles up
WHERE up.user_id = u.id;

DROP TABLE IF EXISTS user_profiles;

-- ═════════════════════════════════════════════════════════════════════════════
-- 3. DATA INTEGRITY CHECK CONSTRAINTS
-- ═════════════════════════════════════════════════════════════════════════════

-- Prices must be non-negative
DO $$ BEGIN
  ALTER TABLE listings
    ADD CONSTRAINT chk_listings_price_non_negative
    CHECK (price_usd IS NULL OR price_usd >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ratings must be in [0, 5]
DO $$ BEGIN
  ALTER TABLE listings
    ADD CONSTRAINT chk_listings_rating_range
    CHECK (rating BETWEEN 0 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE providers
    ADD CONSTRAINT chk_providers_rating_range
    CHECK (rating BETWEEN 0 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Commission rate must be a valid percentage [0, 1]
DO $$ BEGIN
  ALTER TABLE providers
    ADD CONSTRAINT chk_providers_commission_range
    CHECK (commission_rate BETWEEN 0 AND 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Total counts must be non-negative
DO $$ BEGIN
  ALTER TABLE listings
    ADD CONSTRAINT chk_listings_counts_non_negative
    CHECK (total_reviews >= 0 AND total_bookings >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE providers
    ADD CONSTRAINT chk_providers_counts_non_negative
    CHECK (total_reviews >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═════════════════════════════════════════════════════════════════════════════
-- 4. MISSING PERFORMANCE INDEXES
-- ═════════════════════════════════════════════════════════════════════════════

-- Bookings by provider+status (common admin and provider dashboard query)
CREATE INDEX IF NOT EXISTS idx_bookings_provider_status
  ON bookings(provider_id, status);

-- Reviews filtered by approval (used in rating trigger and public queries)
CREATE INDEX IF NOT EXISTS idx_reviews_listing_approved
  ON reviews(listing_id, is_approved);

-- Listings by provider + published (provider dashboard)
CREATE INDEX IF NOT EXISTS idx_listings_provider_published
  ON listings(provider_id, is_published);

-- WhatsApp conversations ordered by last message (inbox query)
-- Already has idx_wa_conv_provider but adding unread filter variant
CREATE INDEX IF NOT EXISTS idx_wa_conv_unread
  ON wa_conversations(provider_id, unread_count DESC)
  WHERE unread_count > 0;

-- ═════════════════════════════════════════════════════════════════════════════
-- 5. UNIQUE CONSTRAINT ON guest_bookings.confirmation_code
--    Confirmation codes are meant to be unique identifiers for guests to look
--    up their bookings. No constraint existed to enforce this.
-- ═════════════════════════════════════════════════════════════════════════════
DO $$ BEGIN
  ALTER TABLE guest_bookings
    ADD CONSTRAINT uq_guest_bookings_confirmation_code
    UNIQUE (confirmation_code);
EXCEPTION WHEN duplicate_object THEN NULL;
WHEN OTHERS THEN
  RAISE WARNING 'Could not add UNIQUE on confirmation_code (likely duplicate values exist): %', SQLERRM;
END $$;
