-- Enable PostGIS extension for spatial analysis
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create specials table with robust fields and auto_parsed tracking
CREATE TABLE IF NOT EXISTS specials (
    id SERIAL PRIMARY KEY,
    restaurant_name VARCHAR(255) NOT NULL,
    specials_description TEXT NOT NULL,
    day_of_week VARCHAR(50) NOT NULL,            -- e.g., 'Monday', 'Tuesday'
    start_time VARCHAR(50),                      -- e.g., '17:00' or '5 PM'
    end_time VARCHAR(50),                        -- e.g., '22:00' or '10 PM'
    is_happy_hour BOOLEAN DEFAULT false,
    auto_parsed BOOLEAN DEFAULT true,            -- auto_parsed status boolean field
    status VARCHAR(50) DEFAULT 'auto_parsed',    -- auto_parsed status string field ('auto_parsed', 'pending', 'verified')
    address TEXT,
    ig VARCHAR(255),
    neighborhood VARCHAR(100),
    image TEXT DEFAULT 'https://images.unsplash.com/photo-1538256909204-a1143f4974d6?q=80&w=600&auto=format&fit=crop',
    video TEXT DEFAULT 'https://assets.mixkit.co/videos/preview/mixkit-pouring-beer-into-a-glass-4998-large.mp4',
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    geom GEOGRAPHY(Point, 4326),                 -- Spatial Geography Point
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Automatically populate/sync geography geom point on insert or update
CREATE OR REPLACE FUNCTION update_specials_geom()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
        NEW.geom := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_specials_geom
BEFORE INSERT OR UPDATE ON specials
FOR EACH ROW
EXECUTE FUNCTION update_specials_geom();

-- Create spatial index for optimized ST_DWithin performance
CREATE INDEX IF NOT EXISTS specials_geom_idx ON specials USING GIST (geom);

-- CREATE INDEX for fast lookups on days and happy hours
CREATE INDEX IF NOT EXISTS specials_day_idx ON specials (day_of_week);
CREATE INDEX IF NOT EXISTS specials_happy_hour_idx ON specials (is_happy_hour);
CREATE INDEX IF NOT EXISTS specials_status_idx ON specials (status);

-- ================= SPATIAL FILTERING FUNCTIONS =================

-- Option A: PostGIS ST_DWithin / ST_Distance Query (Recommended)
-- Calculates distance precisely using ellipsoid math (WGS 84) and filters in meters
CREATE OR REPLACE FUNCTION get_specials_within_radius(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_miles DOUBLE PRECISION DEFAULT 15.0
)
RETURNS TABLE (
  id INT,
  restaurant_name VARCHAR,
  specials_description TEXT,
  day_of_week VARCHAR,
  start_time VARCHAR,
  end_time VARCHAR,
  is_happy_hour BOOLEAN,
  auto_parsed BOOLEAN,
  status VARCHAR,
  address TEXT,
  ig VARCHAR,
  neighborhood VARCHAR,
  image TEXT,
  video TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  distance_miles DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.restaurant_name,
    s.specials_description,
    s.day_of_week,
    s.start_time,
    s.end_time,
    s.is_happy_hour,
    s.auto_parsed,
    s.status,
    s.address,
    s.ig,
    s.neighborhood,
    s.image,
    s.video,
    s.lat,
    s.lng,
    -- Distance returned in meters, convert to miles (1 meter = 0.000621371 miles)
    (ST_Distance(s.geom, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography) * 0.000621371)::DOUBLE PRECISION AS distance_miles
  FROM specials s
  WHERE ST_DWithin(
    s.geom,
    ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
    radius_miles * 1609.34 -- 1 mile = 1609.34 meters
  )
  ORDER BY distance_miles ASC;
END;
$$;


-- Option B: Pure Mathematical Coordinate Calculation (Haversine Formula Fallback)
-- Useful if PostGIS extensions are restricted in specific target environments
CREATE OR REPLACE FUNCTION get_specials_within_radius_math(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_miles DOUBLE PRECISION DEFAULT 15.0
)
RETURNS TABLE (
  id INT,
  restaurant_name VARCHAR,
  specials_description TEXT,
  day_of_week VARCHAR,
  start_time VARCHAR,
  end_time VARCHAR,
  is_happy_hour BOOLEAN,
  auto_parsed BOOLEAN,
  status VARCHAR,
  address TEXT,
  ig VARCHAR,
  neighborhood VARCHAR,
  image TEXT,
  video TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  distance_miles DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
DECLARE
  earth_radius_miles CONSTANT DOUBLE PRECISION := 3958.8;
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.restaurant_name,
    s.specials_description,
    s.day_of_week,
    s.start_time,
    s.end_time,
    s.is_happy_hour,
    s.auto_parsed,
    s.status,
    s.address,
    s.ig,
    s.neighborhood,
    s.image,
    s.video,
    s.lat,
    s.lng,
    -- Spherical Law of Cosines or Haversine Formula for distance
    (earth_radius_miles * 2 * ASIN(SQRT(
      POWER(SIN((s.lat - user_lat) * pi() / 180 / 2), 2) +
      COS(user_lat * pi() / 180) * COS(s.lat * pi() / 180) *
      POWER(SIN((s.lng - user_lng) * pi() / 180 / 2), 2)
    )))::DOUBLE PRECISION AS distance_miles
  FROM specials s
  WHERE s.lat IS NOT NULL AND s.lng IS NOT NULL AND (
    earth_radius_miles * 2 * ASIN(SQRT(
      POWER(SIN((s.lat - user_lat) * pi() / 180 / 2), 2) +
      COS(user_lat * pi() / 180) * COS(s.lat * pi() / 180) *
      POWER(SIN((s.lng - user_lng) * pi() / 180 / 2), 2)
    ))
  ) <= radius_miles
  ORDER BY distance_miles ASC;
END;
$$;
