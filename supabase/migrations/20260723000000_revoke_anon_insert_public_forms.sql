-- Revoke anonymous INSERT access for public form tables.
--
-- Context: the anon INSERT grant and matching RLS policies added in
-- 20260624000000_add_anon_insert_policies_for_public_forms.sql were written
-- under the assumption that a future frontend anon client might insert directly
-- into Supabase. That pattern has been rejected: all public form submissions
-- now go through Express, which uses the service_role key and provides input
-- validation and rate limiting before touching the database.
--
-- Direct anon INSERT:
--   • bypasses Express validation (email format, required fields, type checks)
--   • bypasses Express rate limiting
--   • provides no meaningful benefit since the UI already posts to /api routes
--
-- Security posture after this migration:
--   anon role         → no INSERT, no SELECT, no UPDATE, no DELETE
--   authenticated     → unchanged (no policies exist for authenticated role)
--   service_role      → unchanged, bypasses RLS as before
--   RLS               → remains enabled on both tables
--   table structure   → unchanged

-- ── waitlist_emails ────────────────────────────────────────────────────────────

-- Drop the RLS policy first (a REVOKE alone would still leave the policy in
-- place; defensive teardown removes it so the intent is unambiguous).
drop policy if exists "anon can insert waitlist_emails" on public.waitlist_emails;

-- Remove the INSERT privilege from the anon role.
-- RESTRICT is the default, but stated explicitly for clarity.
revoke insert on public.waitlist_emails from anon;

-- ── venue_claims ───────────────────────────────────────────────────────────────

drop policy if exists "anon can insert venue_claims" on public.venue_claims;

revoke insert on public.venue_claims from anon;
