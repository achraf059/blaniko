-- Migration: Create one-time replacement RPC for V3 venue import.
-- This RPC accepts a JSONB payload of exactly 99 venues, validates it,
-- deletes all existing venues, and inserts the new ones — all in a single
-- transaction that auto-rolls-back on any failure.
--
-- DO NOT EXECUTE until ready for production V3 import.
-- After successful import, run the drop migration to remove this RPC.

CREATE OR REPLACE FUNCTION replace_venues_v3(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  venue_count INTEGER;
  v JSONB;
  inserted_count INTEGER := 0;
BEGIN
  -- ─── Validate payload structure ────────────────────────────────────────────

  IF jsonb_typeof(payload) != 'array' THEN
    RAISE EXCEPTION 'Payload must be a JSON array, got: %', jsonb_typeof(payload);
  END IF;

  venue_count := jsonb_array_length(payload);

  IF venue_count != 99 THEN
    RAISE EXCEPTION 'Payload must contain exactly 99 venues, got: %', venue_count;
  END IF;

  -- ─── Validate each entry has required fields ───────────────────────────────

  FOR v IN SELECT * FROM jsonb_array_elements(payload)
  LOOP
    IF v->>'external_id' IS NULL OR v->>'external_id' = '' THEN
      RAISE EXCEPTION 'Venue missing external_id: %', v;
    END IF;

    IF v->>'name' IS NULL OR v->>'name' = '' THEN
      RAISE EXCEPTION 'Venue % missing name', v->>'external_id';
    END IF;

    IF v->>'slug' IS NULL OR v->>'slug' = '' THEN
      RAISE EXCEPTION 'Venue % missing slug', v->>'external_id';
    END IF;

    IF v->>'category' IS NULL OR v->>'category' = '' THEN
      RAISE EXCEPTION 'Venue % missing category', v->>'external_id';
    END IF;

    IF v->>'contact_information' IS NULL THEN
      RAISE EXCEPTION 'Venue % missing contact_information', v->>'external_id';
    END IF;

    IF v->>'experience_description' IS NULL OR v->>'experience_description' = '' THEN
      RAISE EXCEPTION 'Venue % missing experience_description', v->>'external_id';
    END IF;

    IF v->>'google_maps_url' IS NULL OR v->>'google_maps_url' = '' THEN
      RAISE EXCEPTION 'Venue % missing google_maps_url', v->>'external_id';
    END IF;

    -- Validate indoor_outdoor if present
    IF v->>'indoor_outdoor' IS NOT NULL AND
       v->>'indoor_outdoor' NOT IN ('Indoor', 'Outdoor', 'Indoor / Outdoor') THEN
      RAISE EXCEPTION 'Venue % has invalid indoor_outdoor value: %',
        v->>'external_id', v->>'indoor_outdoor';
    END IF;

    -- Enforce price fields are NULL
    IF v->>'price' IS NOT NULL THEN
      RAISE EXCEPTION 'Venue % must have NULL price', v->>'external_id';
    END IF;

    IF v->>'price_details' IS NOT NULL THEN
      RAISE EXCEPTION 'Venue % must have NULL price_details', v->>'external_id';
    END IF;

    IF v->>'price_level' IS NOT NULL THEN
      RAISE EXCEPTION 'Venue % must have NULL price_level', v->>'external_id';
    END IF;

    -- Enforce lat/lng are NULL
    IF (v->>'lat') IS NOT NULL THEN
      RAISE EXCEPTION 'Venue % must have NULL lat', v->>'external_id';
    END IF;

    IF (v->>'lng') IS NOT NULL THEN
      RAISE EXCEPTION 'Venue % must have NULL lng', v->>'external_id';
    END IF;
  END LOOP;

  -- ─── Clear user_favorites (currently 0 rows, but safe to clear) ────────────

  DELETE FROM user_favorites;

  -- ─── NEVER touch venue_claims, profiles, waitlist_emails, or auth ──────────

  -- ─── Delete all existing venues ────────────────────────────────────────────

  DELETE FROM venues;

  -- ─── Insert all 99 new venues ──────────────────────────────────────────────

  FOR v IN SELECT * FROM jsonb_array_elements(payload)
  LOOP
    INSERT INTO venues (
      external_id, name, slug, category, subcategory,
      additional_experiences, location_text, google_maps_url,
      contact_information, audience_tags, experience_description,
      atmosphere_tags, indoor_outdoor, facebook, opening_hours_raw,
      booking_method, booking_link, research_status, verification_level,
      last_verified_date, verified_by, price, price_details, price_level,
      lat, lng, is_active, source,
      -- compatibility fields
      address, phone, google_maps_link, audience, vibe,
      short_description, overview, region, neighborhood,
      image_url, website, instagram,
      best_for_tags, space_type, time_of_day
    ) VALUES (
      v->>'external_id',
      v->>'name',
      v->>'slug',
      v->>'category',
      v->>'subcategory',
      CASE WHEN v->'additional_experiences' IS NOT NULL AND jsonb_typeof(v->'additional_experiences') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(v->'additional_experiences'))
        ELSE NULL END,
      v->>'location_text',
      v->>'google_maps_url',
      v->>'contact_information',
      CASE WHEN v->'audience_tags' IS NOT NULL AND jsonb_typeof(v->'audience_tags') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(v->'audience_tags'))
        ELSE NULL END,
      v->>'experience_description',
      CASE WHEN v->'atmosphere_tags' IS NOT NULL AND jsonb_typeof(v->'atmosphere_tags') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(v->'atmosphere_tags'))
        ELSE NULL END,
      v->>'indoor_outdoor',
      v->>'facebook',
      v->>'opening_hours_raw',
      CASE WHEN v->'booking_method' IS NOT NULL AND jsonb_typeof(v->'booking_method') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(v->'booking_method'))
        ELSE NULL END,
      v->>'booking_link',
      v->>'research_status',
      v->>'verification_level',
      CASE WHEN v->>'last_verified_date' IS NOT NULL
        THEN (v->>'last_verified_date')::DATE
        ELSE NULL END,
      v->>'verified_by',
      NULL, -- price always NULL
      NULL, -- price_details always NULL
      NULL, -- price_level always NULL
      NULL, -- lat always NULL
      NULL, -- lng always NULL
      COALESCE((v->>'is_active')::BOOLEAN, true),
      COALESCE(v->>'source', 'v3_import'),
      -- compatibility
      v->>'address',
      v->>'phone',
      v->>'google_maps_link',
      v->>'audience',
      v->>'vibe',
      v->>'short_description',
      v->>'overview',
      NULL, -- region
      NULL, -- neighborhood
      v->>'image_url',
      v->>'website',
      v->>'instagram',
      CASE WHEN v->'best_for_tags' IS NOT NULL AND jsonb_typeof(v->'best_for_tags') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(v->'best_for_tags'))
        ELSE NULL END,
      v->>'space_type',
      CASE WHEN v->'time_of_day' IS NOT NULL AND jsonb_typeof(v->'time_of_day') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(v->'time_of_day'))
        ELSE NULL END
    );

    inserted_count := inserted_count + 1;
  END LOOP;

  -- ─── Final verification ────────────────────────────────────────────────────

  IF inserted_count != 99 THEN
    RAISE EXCEPTION 'Expected 99 inserts, got: %', inserted_count;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'inserted', inserted_count,
    'message', 'V3 venue replacement complete'
  );
END;
$$;

-- ─── Access control ──────────────────────────────────────────────────────────
-- service_role ONLY — never callable by anon or authenticated users.

REVOKE ALL ON FUNCTION replace_venues_v3(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION replace_venues_v3(JSONB) FROM anon;
REVOKE ALL ON FUNCTION replace_venues_v3(JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION replace_venues_v3(JSONB) TO service_role;
