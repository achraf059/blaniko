-- ============================================================================
-- LOCAL / EMERGENCY REFERENCE ONLY. DO NOT APPLY AUTOMATICALLY.
-- This file is NOT a migration. It lives outside supabase/migrations/ and is never
-- executed by the Supabase CLI. It reverses 20261008090000_add_collection_tombstones.sql
-- and restores the Phase 2 collection schema (hard DELETE by clients and service_role, and
-- service_role UPDATE on user_collection_items).
--
-- FAILS CLOSED WHEN REAL TOMBSTONES EXIST. A tombstone is a permanent deletion fact. If this
-- reference dropped deleted_at while tombstones exist, every tombstoned row would become an
-- ordinary LIVE collection called "Deleted collection" (a resurrection of deleted UUIDs), and
-- deleting the tombstones instead would free those UUIDs for reuse. Neither is acceptable, so the
-- script refuses to run while any row has deleted_at set. It is safe only BEFORE any client has
-- used the feature, and only after the clients that depend on tombstones have been rolled back.
--
-- The whole file is one transaction: if the guard raises, nothing below it takes effect. The table
-- is locked first so a tombstone cannot appear between the guard and the column drop.
--
-- Roll back in REVERSE order of the migrations. This is the newest one, so it comes before any
-- Phase 2 rollback. It does not touch supabase_migrations.schema_migrations (like the Phase 2
-- rollbacks), so it is a schema reference, not a CLI-managed down migration.
-- ============================================================================

begin;

set local lock_timeout = '10s';
lock table public.user_collections, public.user_collection_items in share row exclusive mode;

do $$
declare
  n bigint;
begin
  select count(*) into n from public.user_collections where deleted_at is not null;
  if n > 0 then
    raise exception 'refusing to roll back collection tombstones: % tombstoned collection(s) exist; dropping deleted_at would resurrect them as live "Deleted collection" rows', n
      using errcode = 'TS002';
  end if;
end;
$$;

-- Triggers first (they depend on the functions and on deleted_at), then the functions.
drop trigger user_collection_items_bump_parent_on_delete on public.user_collection_items;
drop trigger user_collection_items_bump_parent_on_insert on public.user_collection_items;
drop trigger user_collection_items_lock_parent on public.user_collection_items;
drop trigger user_collections_purge_items on public.user_collections;
drop trigger user_collections_tombstone_guard on public.user_collections;

drop function public.user_collection_items_bump_parent_on_delete();
drop function public.user_collection_items_bump_parent_on_insert();
drop function public.user_collection_items_lock_parent();
drop function public.user_collections_purge_items();
drop function public.user_collections_tombstone_guard();

-- The scrub CHECK depends on the column.
alter table public.user_collections drop constraint user_collections_tombstone_scrubbed;
alter table public.user_collections drop column deleted_at;   -- also removes the UPDATE (deleted_at) grant

-- Restore the Phase 2 privileges and policy exactly as 20261007082132 created them.
grant delete on table public.user_collections to authenticated;
grant delete on table public.user_collections to service_role;
grant update on table public.user_collection_items to service_role;   -- Phase 2 granted service_role SELECT, INSERT, UPDATE, DELETE here

create policy "authenticated users can delete own collections"
  on public.user_collections
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.user_collections is
  'Account-sync collections. id is the client-generated UUID (no default). See docs/database/sync-schema.md.';

commit;
