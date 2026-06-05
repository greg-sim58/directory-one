-- PostGIS extension and a CHECK that keeps `geom` in sync with `lat`/`lon`.
-- drizzle-kit does not emit `CREATE EXTENSION` statements, so this lives
-- in a custom migration that runs after the schema migration.

CREATE EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint

-- Sanity: `lat` ∈ [-90, 90], `lon` ∈ [-180, 180]. Surface bad seed data early
-- instead of letting it silently corrupt geo queries downstream.
ALTER TABLE "businesses"
  ADD CONSTRAINT "businesses_lat_range_chk" CHECK ("lat" BETWEEN -90 AND 90),
  ADD CONSTRAINT "businesses_lon_range_chk" CHECK ("lon" BETWEEN -180 AND 180);--> statement-breakpoint

-- Application code writes both `lat/lon` and `geom` (WKT). A trigger keeps
-- them in sync as a defense in depth — if a future code path writes only
-- `lat/lon`, the geom column is still updated.
CREATE OR REPLACE FUNCTION businesses_sync_geom()
RETURNS TRIGGER AS $$
BEGIN
  NEW."geom" := ST_SetSRID(ST_MakePoint(NEW."lon", NEW."lat"), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

DROP TRIGGER IF EXISTS businesses_sync_geom_trigger ON "businesses";--> statement-breakpoint

CREATE TRIGGER businesses_sync_geom_trigger
  BEFORE INSERT OR UPDATE OF "lat", "lon" ON "businesses"
  FOR EACH ROW
  EXECUTE FUNCTION businesses_sync_geom();
