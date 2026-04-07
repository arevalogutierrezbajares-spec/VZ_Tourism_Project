-- RUTA Executive Security Transport - Schema Migration
-- Tables, enums, indexes, RLS policies, triggers, and seed data

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE ruta_driver_status AS ENUM ('available', 'on_ride', 'offline', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ruta_vehicle_class AS ENUM ('sedan', 'suv', 'van');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ruta_armor_rating AS ENUM ('b4', 'b5', 'none');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ruta_ride_type AS ENUM ('airport', 'inter_city', 'intra_city');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ruta_ride_status AS ENUM (
    'requested', 'pending_payment', 'confirmed', 'assigned',
    'driver_en_route', 'pickup', 'in_progress', 'completed',
    'cancelled_by_passenger', 'cancelled_by_ops', 'payment_expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ruta_payment_method AS ENUM ('stripe', 'zelle');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ruta_payment_status AS ENUM ('pending', 'paid', 'refunded', 'failed', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- TABLES
-- ============================================================

-- Drivers
CREATE TABLE IF NOT EXISTS ruta_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  photo_url TEXT,
  license_number TEXT NOT NULL UNIQUE,
  license_expiry DATE,
  status ruta_driver_status NOT NULL DEFAULT 'offline',
  tracker_device_id TEXT,
  onboarded_at TIMESTAMPTZ,
  documents_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vehicles
CREATE TABLE IF NOT EXISTS ruta_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  color TEXT NOT NULL,
  plate_number TEXT NOT NULL UNIQUE,
  vehicle_class ruta_vehicle_class NOT NULL DEFAULT 'suv',
  armor_rating ruta_armor_rating NOT NULL DEFAULT 'b5',
  insurance_expiry DATE,
  tracker_device_id TEXT UNIQUE,
  tracker_api_key_hash TEXT, -- bcrypt hash of the tracker API key
  camera_feed_url TEXT, -- Phase 2: RTSP/HLS stream URL
  capacity INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Driver-Vehicle assignments (many-to-many over time)
CREATE TABLE IF NOT EXISTS ruta_driver_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES ruta_drivers(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES ruta_vehicles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ -- NULL = currently active
);

-- Zones for pricing lookups (PostGIS polygons)
CREATE TABLE IF NOT EXISTS ruta_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  zone_type TEXT NOT NULL, -- 'airport', 'city', 'area'
  geom geometry(Polygon, 4326) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vehicle class pricing multipliers
CREATE TABLE IF NOT EXISTS ruta_vehicle_class_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_class ruta_vehicle_class NOT NULL UNIQUE,
  multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ride pricing rules
CREATE TABLE IF NOT EXISTS ruta_ride_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_type ruta_ride_type NOT NULL,
  origin_zone TEXT, -- zone name or airport code
  destination_zone TEXT, -- zone name or area
  base_fare_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  per_km_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  per_minute_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  per_hour_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  fixed_price_usd NUMERIC(10,2), -- if set, overrides calculation
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Core rides table
CREATE TABLE IF NOT EXISTS ruta_rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Passenger info (user_id nullable for guest checkout)
  passenger_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  passenger_name TEXT NOT NULL,
  passenger_email TEXT NOT NULL,
  passenger_phone TEXT NOT NULL,
  passenger_access_token TEXT, -- crypto random token for guest access to ride status
  -- Assignment
  driver_id UUID REFERENCES ruta_drivers(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES ruta_vehicles(id) ON DELETE SET NULL,
  -- Ride details
  ride_type ruta_ride_type NOT NULL,
  pickup_location geometry(Point, 4326),
  pickup_address TEXT NOT NULL,
  dropoff_location geometry(Point, 4326),
  dropoff_address TEXT NOT NULL,
  waypoints JSONB, -- array of {lat, lng, address} for multi-stop
  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL,
  picked_up_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  -- Distance and duration
  distance_km NUMERIC(10,2),
  duration_minutes INTEGER,
  -- Pricing
  price_quoted_usd NUMERIC(10,2) NOT NULL,
  price_final_usd NUMERIC(10,2),
  -- Payment
  payment_method ruta_payment_method NOT NULL DEFAULT 'stripe',
  payment_status ruta_payment_status NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  zelle_confirmation_code TEXT,
  zelle_verified_by UUID REFERENCES auth.users(id),
  zelle_verified_at TIMESTAMPTZ,
  -- Status
  status ruta_ride_status NOT NULL DEFAULT 'requested',
  cancellation_reason TEXT,
  -- Ratings
  driver_rating SMALLINT CHECK (driver_rating >= 1 AND driver_rating <= 5),
  passenger_rating SMALLINT CHECK (passenger_rating >= 1 AND passenger_rating <= 5),
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tracker pings (partitioned by month)
CREATE TABLE IF NOT EXISTS ruta_tracker_pings (
  id BIGINT GENERATED ALWAYS AS IDENTITY,
  device_id TEXT NOT NULL,
  ride_id UUID REFERENCES ruta_rides(id) ON DELETE SET NULL,
  lat DOUBLE PRECISION NOT NULL CHECK (lat >= -90 AND lat <= 90),
  lng DOUBLE PRECISION NOT NULL CHECK (lng >= -180 AND lng <= 180),
  speed NUMERIC(8,2) CHECK (speed >= 0),
  heading NUMERIC(6,2) CHECK (heading >= 0 AND heading < 360),
  "timestamp" TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create initial partitions (current month + next 3 months)
DO $$
DECLARE
  start_date DATE;
  end_date DATE;
  partition_name TEXT;
BEGIN
  FOR i IN 0..3 LOOP
    start_date := date_trunc('month', NOW()) + (i || ' months')::interval;
    end_date := start_date + '1 month'::interval;
    partition_name := 'ruta_tracker_pings_' || to_char(start_date, 'YYYY_MM');
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF ruta_tracker_pings FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date, end_date
    );
  END LOOP;
END $$;

-- ============================================================
-- INDEXES
-- ============================================================

-- Rides
CREATE INDEX IF NOT EXISTS idx_ruta_rides_status_scheduled ON ruta_rides(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_ruta_rides_passenger ON ruta_rides(passenger_user_id) WHERE passenger_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ruta_rides_driver_status ON ruta_rides(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_ruta_rides_zelle_timeout ON ruta_rides(payment_method, status, created_at) WHERE payment_method = 'zelle' AND status = 'pending_payment';
CREATE INDEX IF NOT EXISTS idx_ruta_rides_pickup ON ruta_rides USING GIST(pickup_location);
CREATE INDEX IF NOT EXISTS idx_ruta_rides_dropoff ON ruta_rides USING GIST(dropoff_location);
CREATE INDEX IF NOT EXISTS idx_ruta_rides_stripe ON ruta_rides(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- Prevent double-assignment: one active ride per driver
CREATE UNIQUE INDEX IF NOT EXISTS idx_ruta_one_active_ride_per_driver
  ON ruta_rides(driver_id)
  WHERE status IN ('assigned', 'driver_en_route', 'pickup', 'in_progress');

-- Driver vehicles
CREATE INDEX IF NOT EXISTS idx_ruta_driver_vehicles_active ON ruta_driver_vehicles(driver_id) WHERE unassigned_at IS NULL;

-- Drivers
CREATE INDEX IF NOT EXISTS idx_ruta_drivers_status ON ruta_drivers(status);

-- Tracker pings (partition-local indexes are created automatically on partitions)
CREATE INDEX IF NOT EXISTS idx_ruta_tracker_device_time ON ruta_tracker_pings(device_id, "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_ruta_tracker_ride ON ruta_tracker_pings(ride_id, "timestamp") WHERE ride_id IS NOT NULL;

-- Zones
CREATE INDEX IF NOT EXISTS idx_ruta_zones_geom ON ruta_zones USING GIST(geom);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION ruta_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER ruta_drivers_updated_at BEFORE UPDATE ON ruta_drivers FOR EACH ROW EXECUTE FUNCTION ruta_update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER ruta_vehicles_updated_at BEFORE UPDATE ON ruta_vehicles FOR EACH ROW EXECUTE FUNCTION ruta_update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER ruta_rides_updated_at BEFORE UPDATE ON ruta_rides FOR EACH ROW EXECUTE FUNCTION ruta_update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE ruta_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruta_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruta_driver_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruta_rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruta_ride_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruta_vehicle_class_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruta_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruta_tracker_pings ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user has a RUTA role
CREATE OR REPLACE FUNCTION is_ruta_role(required_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() -> 'user_metadata' ->> 'ruta_role') = ANY(required_roles);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rides: passengers see own, dispatchers/admins see all
CREATE POLICY ruta_rides_passenger_select ON ruta_rides FOR SELECT
  USING (passenger_user_id = auth.uid() OR is_ruta_role(ARRAY['ruta_dispatcher', 'ruta_admin']));

CREATE POLICY ruta_rides_passenger_insert ON ruta_rides FOR INSERT
  WITH CHECK (TRUE); -- Anyone can create a ride (guest checkout)

CREATE POLICY ruta_rides_dispatch_update ON ruta_rides FOR UPDATE
  USING (passenger_user_id = auth.uid() OR is_ruta_role(ARRAY['ruta_dispatcher', 'ruta_admin']));

-- Drivers: dispatchers/admins full access, drivers see own
CREATE POLICY ruta_drivers_dispatch ON ruta_drivers FOR ALL
  USING (is_ruta_role(ARRAY['ruta_dispatcher', 'ruta_admin']));

CREATE POLICY ruta_drivers_self ON ruta_drivers FOR SELECT
  USING (user_id = auth.uid());

-- Vehicles: dispatchers/admins full access
CREATE POLICY ruta_vehicles_dispatch ON ruta_vehicles FOR ALL
  USING (is_ruta_role(ARRAY['ruta_dispatcher', 'ruta_admin']));

CREATE POLICY ruta_vehicles_read ON ruta_vehicles FOR SELECT
  USING (is_ruta_role(ARRAY['ruta_driver']));

-- Driver vehicles: dispatchers/admins full access
CREATE POLICY ruta_driver_vehicles_dispatch ON ruta_driver_vehicles FOR ALL
  USING (is_ruta_role(ARRAY['ruta_dispatcher', 'ruta_admin']));

-- Pricing: read for all authenticated, write for admins
CREATE POLICY ruta_pricing_read ON ruta_ride_pricing FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY ruta_pricing_admin ON ruta_ride_pricing FOR ALL
  USING (is_ruta_role(ARRAY['ruta_admin']));

-- Vehicle class pricing: same as ride pricing
CREATE POLICY ruta_vclass_pricing_read ON ruta_vehicle_class_pricing FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY ruta_vclass_pricing_admin ON ruta_vehicle_class_pricing FOR ALL
  USING (is_ruta_role(ARRAY['ruta_admin']));

-- Zones: read for all, write for admins
CREATE POLICY ruta_zones_read ON ruta_zones FOR SELECT
  USING (TRUE);

CREATE POLICY ruta_zones_admin ON ruta_zones FOR ALL
  USING (is_ruta_role(ARRAY['ruta_admin']));

-- Tracker pings: insert via service role (handled in API), select for dispatchers
CREATE POLICY ruta_tracker_pings_dispatch ON ruta_tracker_pings FOR SELECT
  USING (is_ruta_role(ARRAY['ruta_dispatcher', 'ruta_admin']));

-- ============================================================
-- SEED DATA
-- ============================================================

-- Vehicle class multipliers
INSERT INTO ruta_vehicle_class_pricing (vehicle_class, multiplier) VALUES
  ('sedan', 1.0),
  ('suv', 1.3),
  ('van', 1.5)
ON CONFLICT (vehicle_class) DO NOTHING;

-- Sample airport pricing (CCS corridors)
INSERT INTO ruta_ride_pricing (route_type, origin_zone, destination_zone, fixed_price_usd) VALUES
  ('airport', 'CCS', 'caracas_east', 280.00),
  ('airport', 'CCS', 'caracas_west', 320.00),
  ('airport', 'CCS', 'caracas_center', 260.00),
  ('airport', 'PMV', 'margarita_east', 180.00),
  ('airport', 'PMV', 'margarita_west', 220.00),
  ('airport', 'VLN', 'valencia_center', 200.00),
  ('airport', 'BLA', 'barquisimeto_center', 190.00)
ON CONFLICT DO NOTHING;

-- Inter-city pricing (base + per-km)
INSERT INTO ruta_ride_pricing (route_type, base_fare_usd, per_km_rate) VALUES
  ('inter_city', 50.00, 2.50)
ON CONFLICT DO NOTHING;

-- Intra-city pricing (base + per-km + per-min + per-hour)
INSERT INTO ruta_ride_pricing (route_type, base_fare_usd, per_km_rate, per_minute_rate, per_hour_rate) VALUES
  ('intra_city', 30.00, 3.00, 0.50, 95.00)
ON CONFLICT DO NOTHING;
