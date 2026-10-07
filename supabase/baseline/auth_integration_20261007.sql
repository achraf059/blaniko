-- ============================================================================
-- BLANIKO BASELINE — REFERENCE / LOCAL BOOTSTRAP ONLY
-- DO NOT APPLY TO PRODUCTION
-- ============================================================================
-- Pre-Phase-2 baseline of the Blaniko Supabase project (ref vptjbfoaqmbdjdqwloae), captured 2026-10-07.
-- This is NOT a migration. It must never be moved under supabase/migrations/ and has no
-- automatic production application path. See supabase/baseline/README.md.
-- AUTH INTEGRATION: the only auth-side object a schema-only dump of public cannot reconstruct is the
-- trigger on auth.users that calls public.handle_new_user(). public.handle_new_user() itself is part of
-- public_schema_20261007.sql (load that first). No auth.users rows, no auth schema dump, no data.

do $$
begin
  if exists (select 1 from pg_trigger where tgrelid = 'auth.users'::regclass and tgname = 'on_auth_user_created')
     or exists (select 1 from auth.users) then
    raise exception 'BLANIKO BASELINE refuses to run: auth.users already has the trigger or has rows (this looks like a populated database)';
  end if;
end;
$$;

-- Created as postgres, as in production (run as supabase_admin so the guard above can read auth.users / storage.objects).
set role postgres;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- live state: enabled = O ('O' = enabled, origin/local)
