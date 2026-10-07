-- ============================================================================
-- BLANIKO BASELINE — REFERENCE / LOCAL BOOTSTRAP ONLY
-- DO NOT APPLY TO PRODUCTION
-- ============================================================================
-- Pre-Phase-2 baseline of the Blaniko Supabase project (ref vptjbfoaqmbdjdqwloae), captured 2026-10-07.
-- This is NOT a migration. It must never be moved under supabase/migrations/ and has no
-- automatic production application path. See supabase/baseline/README.md.
-- STORAGE METADATA: configuration of the `venue-images` bucket only. No storage.objects rows, no file
-- contents, no URLs, no signed URLs, no owner ids.
--
-- Live state recorded here (see also 18_storage_bucket_venue_images and 19_storage_rls_and_policies in the
-- catalog snapshot): storage.objects has RLS enabled and NO bucket-specific policies for venue-images; the
-- bucket is public (read through the public URL) and uploads happen only through a service-role workflow.

do $$
declare
  has_objects boolean := false;
begin
  -- storage.objects exists only where the Storage service has initialised its schema.
  if to_regclass('storage.objects') is not null then
    execute 'select exists (select 1 from storage.objects)' into has_objects;
  end if;
  if has_objects then
    raise exception 'BLANIKO BASELINE refuses to run: storage.objects has rows (this looks like a populated database)';
  end if;
end;
$$;

-- Created as postgres, as in production (run as supabase_admin so the guard above can read auth.users / storage.objects).
set role postgres;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types, avif_autodetection, type)
values ('venue-images', 'venue-images', true, null, null, false, 'STANDARD'::storage.buckettype)
on conflict (id) do nothing;
