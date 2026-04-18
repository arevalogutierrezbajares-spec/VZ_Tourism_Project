-- Degusta Venezuela scraped restaurant data (1,297 restaurants from Caracas)
CREATE TABLE IF NOT EXISTS degusta_restaurants (
    id BIGSERIAL PRIMARY KEY,
    degusta_id INTEGER UNIQUE,
    name TEXT NOT NULL,
    phone TEXT,
    website TEXT,
    instagram TEXT,
    address TEXT,
    neighborhood TEXT,
    city TEXT NOT NULL DEFAULT 'Caracas',
    latitude NUMERIC(12,7),
    longitude NUMERIC(12,7),
    google_maps_link TEXT,
    cuisine TEXT,
    rating NUMERIC(3,2),
    price_range TEXT,
    degusta_url TEXT,
    geo_point GEOMETRY(POINT, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_degusta_restaurants_neighborhood ON degusta_restaurants(neighborhood);
CREATE INDEX IF NOT EXISTS idx_degusta_restaurants_cuisine ON degusta_restaurants(cuisine);
CREATE INDEX IF NOT EXISTS idx_degusta_restaurants_city ON degusta_restaurants(city);
CREATE INDEX IF NOT EXISTS idx_degusta_restaurants_geo ON degusta_restaurants USING GIST(geo_point);
CREATE INDEX IF NOT EXISTS idx_degusta_restaurants_name_trgm ON degusta_restaurants USING GIN(name gin_trgm_ops);

-- Auto-set geo_point from lat/lon
CREATE OR REPLACE FUNCTION update_degusta_geo_point()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.geo_point = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS degusta_restaurants_geo_trigger ON degusta_restaurants;
CREATE TRIGGER degusta_restaurants_geo_trigger
    BEFORE INSERT OR UPDATE OF latitude, longitude ON degusta_restaurants
    FOR EACH ROW EXECUTE FUNCTION update_degusta_geo_point();

-- Updated_at trigger (reuses existing function from 001)
DROP TRIGGER IF EXISTS update_degusta_restaurants_updated_at ON degusta_restaurants;
CREATE TRIGGER update_degusta_restaurants_updated_at
    BEFORE UPDATE ON degusta_restaurants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: public read, service role full access
ALTER TABLE degusta_restaurants ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public can read degusta restaurants"
      ON degusta_restaurants FOR SELECT USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can manage degusta restaurants"
      ON degusta_restaurants FOR ALL
      USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
