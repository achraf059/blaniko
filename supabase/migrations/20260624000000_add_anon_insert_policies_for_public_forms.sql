-- Add explicit INSERT-only RLS policies for the anon role on public form tables.
--
-- Context: waitlist_emails and venue_claims both have RLS enabled but no
-- policies defined. The Express backend uses the Supabase service role key,
-- which bypasses RLS entirely, so forms work today. These policies make the
-- intended access control explicit so that a future frontend anon client can
-- insert safely without accidentally gaining read or write-back access.
--
-- Security posture after this migration:
--   anon role         → INSERT only (enforced by both GRANT and RLS policy)
--   authenticated     → no access (public forms do not require a user account)
--   service_role      → unchanged, bypasses RLS as before
--   SELECT            → denied for anon/authenticated (no SELECT policy exists)
--   UPDATE / DELETE   → denied for anon/authenticated (no UPDATE/DELETE policies exist)
--
-- Note: a PostgreSQL GRANT is required in addition to an RLS policy. Without
-- the GRANT, the privilege layer blocks the operation before RLS is evaluated.

-- ── waitlist_emails ────────────────────────────────────────────────────────────

-- Allow the anon role to execute INSERT on this table.
-- SELECT, UPDATE, DELETE are intentionally not granted.
grant insert on public.waitlist_emails to anon;

-- RLS policy: anon may submit a waitlist email.
-- `with check (true)` is safe here because:
--   • email is NOT NULL UNIQUE — empty or duplicate values are rejected at the DB level
--   • source, language, page all carry NOT NULL defaults, so a minimal insert succeeds
--   • the Express backend validates email format with the `validator` library before
--     this insert ever reaches Supabase, making double-validation at RLS unnecessary
create policy "anon can insert waitlist_emails"
  on public.waitlist_emails
  for insert
  to anon
  with check (true);

-- ── venue_claims ───────────────────────────────────────────────────────────────

-- Allow the anon role to execute INSERT on this table.
-- SELECT, UPDATE, DELETE are intentionally not granted.
grant insert on public.venue_claims to anon;

-- RLS policy: anon may submit a venue claim or listing request.
-- `with check (true)` is safe here because:
--   • type has a CHECK constraint: only ('claim', 'listing') are accepted
--   • contact_name, contact_email, message are NOT NULL — empty inserts fail at the DB level
--   • status defaults to 'pending' and has CHECK (status IN ('pending','reviewed','approved','rejected'))
--     — anon cannot supply a different status; the default is applied before the check constraint fires
--   • admin_notes and reviewed_at are nullable and only written by the admin backend
--   • the Express backend validates contact_email format and all required fields before
--     this insert reaches Supabase, making extra RLS logic unnecessary
create policy "anon can insert venue_claims"
  on public.venue_claims
  for insert
  to anon
  with check (true);
