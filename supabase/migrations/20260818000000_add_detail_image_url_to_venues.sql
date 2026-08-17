-- Add nullable detail_image_url column to venues for the VenuePage hero image.
--
-- Context: `image_url` already exists and drives the card/listing image. This
-- adds a SEPARATE, optional hero/detail image so a venue can show a different
-- (or higher-res) picture on its detail page. Both are plain public URLs.
--
-- ADDITIVE ONLY — does NOT drop, rename, or modify existing columns.
-- Existing `image_url` behavior is untouched.
--
-- When both columns are null the frontend continues to render the existing
-- "Photo coming soon" placeholder.

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS detail_image_url TEXT;
