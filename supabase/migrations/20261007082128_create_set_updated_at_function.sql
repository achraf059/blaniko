-- Shared updated_at trigger function for the account-sync tables (Phase 2).
--
-- Used by BEFORE INSERT OR UPDATE triggers on user_collections, user_outings and
-- user_taste_profiles. The server overwrites updated_at on INSERT as well as on UPDATE,
-- so a client can never choose it (an INSERT may name the column, and the trigger
-- replaces the value). It is row metadata, not a conflict-resolution timestamp.
--
-- Security posture:
--   SECURITY INVOKER  the function only assigns to NEW; it reads and writes no
--                     other object, so it needs no elevated privileges.
--   search_path = ''  nothing is resolved through the caller's search_path
--                     (pg_catalog is still searched implicitly); every name is
--                     schema-qualified.
--   EXECUTE revoked   a trigger function cannot be called directly anyway; the
--                     revoke is belt-and-braces. PostgreSQL checks EXECUTE on a
--                     trigger function when the trigger is CREATED (by the
--                     migration role), not when it fires; docs/database/
--                     sync-schema.md and the database tests prove firing works
--                     for roles that hold no EXECUTE.
--
-- ADDITIVE ONLY: creates one new function. Nothing existing is altered.

create function public.set_updated_at()
  returns trigger
  language plpgsql
  security invoker
  set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated, service_role;

comment on function public.set_updated_at() is
  'BEFORE INSERT OR UPDATE trigger function: sets updated_at to the transaction time. Used by the account-sync tables.';
