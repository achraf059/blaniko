-- Add nullable coordinate columns to venues for map display.
-- Columns are left empty; coordinate data is populated separately.

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION
    CHECK (lat BETWEEN -90 AND 90);

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION
    CHECK (lng BETWEEN -180 AND 180);
