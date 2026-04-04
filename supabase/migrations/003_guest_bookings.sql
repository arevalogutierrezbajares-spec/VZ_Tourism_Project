-- Guest bookings table: stores bookings from unauthenticated users
-- and bookings linked to scraped listings (which have no real provider FK).
-- Mirrors the LocalBooking interface in lib/bookings-store.ts.

CREATE TABLE IF NOT EXISTS guest_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id TEXT NOT NULL,
  listing_name TEXT NOT NULL,
  listing_slug TEXT,
  provider_id TEXT,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guest_count INTEGER NOT NULL DEFAULT 1,
  base_price_usd NUMERIC(10,2) NOT NULL,
  nights INTEGER NOT NULL DEFAULT 1,
  subtotal_usd NUMERIC(10,2) NOT NULL,
  service_fee_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_usd NUMERIC(10,2) NOT NULL,
  commission_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_provider_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL DEFAULT 'card',
  payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  confirmation_code TEXT NOT NULL,
  special_requests TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_bookings_email ON guest_bookings(guest_email);
CREATE INDEX IF NOT EXISTS idx_guest_bookings_status ON guest_bookings(status);
CREATE INDEX IF NOT EXISTS idx_guest_bookings_session ON guest_bookings(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_guest_bookings_listing ON guest_bookings(listing_id);

-- Allow service role full access; anon/authenticated users can only read their own
ALTER TABLE guest_bookings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role has full access to guest_bookings"
    ON guest_bookings FOR ALL
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trigger to update updated_at timestamp
DO $$ BEGIN
  CREATE TRIGGER update_guest_bookings_updated_at
    BEFORE UPDATE ON guest_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
