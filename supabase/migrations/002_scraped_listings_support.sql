-- Make provider_id nullable so scraped listings don't need a provider
ALTER TABLE listings ALTER COLUMN provider_id DROP NOT NULL;

-- Give price_usd a default so scraped listings can be inserted without a price
ALTER TABLE listings ALTER COLUMN price_usd SET DEFAULT 0;
ALTER TABLE listings ALTER COLUMN price_usd DROP NOT NULL;

-- Change category from enum to TEXT so we can store scraped type values
-- First drop the default if any, then alter type
ALTER TABLE listings ALTER COLUMN category TYPE TEXT USING category::TEXT;
ALTER TABLE listings ALTER COLUMN category SET DEFAULT 'other';

-- Add scraped-specific columns (idempotent)
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
  ADD COLUMN IF NOT EXISTS google_place_id TEXT,
  ADD COLUMN IF NOT EXISTS platform_status TEXT NOT NULL DEFAULT 'scraped',
  ADD COLUMN IF NOT EXISTS photos_json JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_listings_platform_status ON listings(platform_status);
CREATE INDEX IF NOT EXISTS idx_listings_google_place_id ON listings(google_place_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_google_place_id_unique ON listings(google_place_id) WHERE google_place_id IS NOT NULL;
