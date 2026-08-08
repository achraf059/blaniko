-- Migration: Modernize venues schema for V3 data
-- Adds canonical columns needed by V3 venue dataset.
-- ADDITIVE ONLY — does NOT drop, rename, or modify existing columns.
-- DO NOT execute until ready for V3 import.

-- ─── New canonical columns ───────────────────────────────────────────────────

ALTER TABLE venues ADD COLUMN IF NOT EXISTS additional_experiences TEXT[];
ALTER TABLE venues ADD COLUMN IF NOT EXISTS location_text TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS google_maps_url TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS contact_information TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS audience_tags TEXT[];
ALTER TABLE venues ADD COLUMN IF NOT EXISTS experience_description TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS atmosphere_tags TEXT[];
ALTER TABLE venues ADD COLUMN IF NOT EXISTS indoor_outdoor TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS facebook TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS opening_hours_raw TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS booking_method TEXT[];
ALTER TABLE venues ADD COLUMN IF NOT EXISTS booking_link TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS research_status TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS verification_level TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS last_verified_date DATE;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS price TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS price_details TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS best_for_tags TEXT[];
ALTER TABLE venues ADD COLUMN IF NOT EXISTS space_type TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS time_of_day TEXT[];

-- ─── CHECK constraint for indoor_outdoor ─────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'venues_indoor_outdoor_check'
  ) THEN
    ALTER TABLE venues ADD CONSTRAINT venues_indoor_outdoor_check
      CHECK (indoor_outdoor IN ('Indoor', 'Outdoor', 'Indoor / Outdoor'));
  END IF;
END
$$;

-- ─── Useful indexes ──────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_venues_category ON venues (category);
CREATE INDEX IF NOT EXISTS idx_venues_is_active ON venues (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_venues_audience_tags ON venues USING GIN (audience_tags);
CREATE INDEX IF NOT EXISTS idx_venues_atmosphere_tags ON venues USING GIN (atmosphere_tags);

-- RLS is already enabled on venues. Do NOT add anon/authenticated policies here.
-- Do NOT recreate existing UNIQUE constraints (external_id, slug).
