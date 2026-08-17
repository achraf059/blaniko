-- Create the `venue-images` Storage bucket for venue card/detail imagery.
--
-- Object layout (one folder per permanent Blaniko ID):
--   venue-images/BLK-0050/card.webp     → listing/card image  (venues.image_url)
--   venue-images/BLK-0050/detail.webp   → VenuePage hero image (venues.detail_image_url)
--
-- Security posture after this migration:
--   read (SELECT)        → served publicly because the bucket is public; no
--                          explicit storage.objects policy is needed for this.
--   INSERT/UPDATE/DELETE → no policy created for anon or authenticated, so RLS
--                          denies them. Uploads happen only through a trusted
--                          service-role/admin workflow, which bypasses RLS.
--                          Public visitors can never upload, overwrite, or delete.
--
-- The website is public, so images must be publicly readable. `public = true`
-- already serves objects at /storage/v1/object/public/venue-images/... without
-- auth, so no SELECT policy on storage.objects is added here.

-- ── Bucket ───────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('venue-images', 'venue-images', true)
on conflict (id) do nothing;
