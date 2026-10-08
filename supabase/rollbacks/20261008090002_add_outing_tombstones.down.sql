-- ============================================================================
-- LOCAL / EMERGENCY REFERENCE ONLY. DO NOT APPLY AUTOMATICALLY.
-- This file is NOT a migration. It lives outside supabase/migrations/ and is never
-- executed by the Supabase CLI. It reverses 20261008090002_add_outing_tombstones.sql and restores the
-- state after 20261008090000_add_collection_tombstones.sql (hard DELETE on user_outings for
-- authenticated and service_role). It does NOT touch the collection tombstone work.
--
-- FAILS CLOSED WHEN REAL TOMBSTONES EXIST. A tombstone is a permanent deletion fact. If this reference
-- dropped deleted_at while tombstones exist, every tombstoned row would become an ordinary LIVE outing
-- holding the scrub payload ("Deleted outing"): a resurrection of deleted UUIDs, and deleting the
-- tombstones instead would free those UUIDs for reuse. Neither is acceptable, so the script refuses to run
-- while any row has deleted_at set. It is safe only BEFORE any client has used the feature, and only after
-- the clients that depend on tombstones have been rolled back.
--
-- The whole file is one transaction: if the guard raises, nothing below it takes effect. The table is
-- locked first so a tombstone cannot appear between the guard and the column drop.
--
-- Roll back in REVERSE order of the migrations: this file BEFORE the collection tombstone rollback and
-- before any Phase 2 rollback (the Phase 2 outings rollback drops the table but would leave this
-- migration's trigger function behind). Like the other rollbacks it does not touch
-- supabase_migrations.schema_migrations, so it is a schema reference, not a CLI-managed down migration.
-- ============================================================================

begin;

set local lock_timeout = '10s';
lock table public.user_outings in share row exclusive mode;

do $$
declare
  n bigint;
begin
  select count(*) into n from public.user_outings where deleted_at is not null;
  if n > 0 then
    raise exception 'refusing to roll back outing tombstones: % tombstoned outing(s) exist; dropping deleted_at would resurrect them as live "Deleted outing" rows', n
      using errcode = 'TS002';
  end if;
end;
$$;

-- The trigger depends on the function and on deleted_at only through the function body, but drop it first.
drop trigger user_outings_tombstone_guard on public.user_outings;
drop function public.user_outings_tombstone_guard();

-- The scrub CHECK depends on the column.
alter table public.user_outings drop constraint user_outings_tombstone_scrubbed;
alter table public.user_outings drop column deleted_at;   -- also removes the UPDATE (deleted_at) grant

-- Restore the privileges and policy exactly as 20261007082134 created them.
grant delete on table public.user_outings to authenticated;
grant delete on table public.user_outings to service_role;

create policy "authenticated users can delete own outings"
  on public.user_outings
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.user_outings is
  'Account-sync outings: versioned JSONB payload. id is the client-generated UUID (no default). schema_version 1 = mobile sync model. See docs/database/sync-schema.md.';

commit;
